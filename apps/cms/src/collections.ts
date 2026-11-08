import type {
  CollectionConfig,
  Field,
  Access,
  TextField,
  NumberField,
  UploadField,
  SelectField,
} from 'payload';
import { createHash } from 'node:crypto';
import { ValidationError } from 'payload';
import { toStory } from './content';
import { validatePublished } from '../../../packages/shared/src/index';
import { publicationDate, slugFromName } from './editor-utils';
import { altFromFilename, kindFromMime } from './media-fields';
import { validateIllustrationFile } from './illustration-upload';
import { normalizePageVisuals } from './page-visual';
import {
  normalizePageNarration,
  pageNarrationLanguages,
} from './page-narration';
import {
  normalizeStoryMetadata,
  storyMetadataLanguages,
} from './story-metadata';
const admin: Access = ({ req }) => !!req.user;
const protectedAccess = {
  read: admin,
  create: admin,
  update: admin,
  delete: admin,
};
const text = (name: string, required = false): TextField => ({
  name,
  type: 'text',
  required,
});
const num = (name: string, defaultValue = 0): NumberField => ({
  name,
  type: 'number',
  defaultValue,
  min: 0,
});
const media = (name: string, required = false): UploadField => ({
  name,
  type: 'upload',
  relationTo: 'media',
  required,
});
const select = (
  name: string,
  options: string[],
  defaultValue?: string,
): SelectField => ({
  name,
  type: 'select',
  options,
  defaultValue: defaultValue ?? options[0],
  required: true,
});
const row = (fields: Field[], className = 'compact-row'): Field => ({
  type: 'row',
  admin: { className },
  fields: fields.map(
    (field) =>
      ({
        ...field,
        admin: { ...field.admin, width: `${100 / fields.length}%` },
      }) as Field,
  ),
});
const music: Field = {
  name: 'music',
  label: 'Background Music',
  type: 'group',
  fields: [
    row(
      [
        {
          ...media('asset'),
          filterOptions: { mimeType: { contains: 'audio/' } },
        },
        { name: 'volume', type: 'number', min: 0, max: 1, defaultValue: 0.2 },
        { name: 'loop', type: 'checkbox', defaultValue: true },
        {
          name: 'duck',
          label: 'Lower music during narration',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          ...num('fadeMs', 400),
          label: 'Fade Duration',
          admin: {
            components: {
              Field: '/src/components/FadeDurationField#FadeDurationField',
            },
          },
        },
      ],
      'compact-row music-row',
    ),
  ],
};
const narrationFields = (): Field[] => [
  { name: 'text', label: 'Narration text', type: 'textarea' },
  row(
    [
      {
        name: 'voiceId',
        type: 'text',
        admin: {
          components: {
            Field: '/src/components/NarrationWorkflow#NarrationVoice',
          },
        },
      },
      {
        ...media('narration'),
        label: 'Narration audio',
        filterOptions: { mimeType: { contains: 'audio/' } },
      },
      {
        name: 'syncNarration',
        type: 'ui',
        admin: {
          components: {
            Field: '/src/components/NarrationWorkflow#NarrationSync',
          },
        },
      },
    ],
    'compact-row narration-media-row',
  ),
  { ...num('durationMs'), admin: { hidden: true, readOnly: true } },
  { ...num('delayMs'), admin: { hidden: true } },
  { name: 'syncState', type: 'json', admin: { hidden: true } },
  {
    name: 'timings',
    type: 'json',
    admin: {
      components: { Field: '/src/components/TimingEditor#TimingEditor' },
      description: 'Import or edit word timings for this narration.',
    },
  },
];
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  access: protectedAccess,
  fields: [text('name')],
};
export const Media: CollectionConfig = {
  slug: 'media',
  access: protectedAccess,
  upload: {
    staticDir: 'media',
    pasteURL: false,
    mimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'video/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
    ],
    imageSizes: [
      { name: 'thumbnail', width: 480, height: 360, position: 'centre' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        components: { Field: '/src/components/MediaAltField#MediaAltField' },
      },
    },
    {
      ...select('kind', [
        'image',
        'video',
        'audio',
        'narration',
        'music',
        'effect',
      ]),
      admin: { hidden: true },
    },
    { name: 'hash', type: 'text', admin: { hidden: true } },
    {
      ...select('processing', ['ready', 'pending', 'error']),
      admin: { hidden: true },
    },
    { ...num('durationMs'), admin: { hidden: true } },
    { ...media('generatedPoster'), admin: { hidden: true } },
    { name: 'originalFilename', type: 'text', admin: { hidden: true } },
    { ...text('processingError'), admin: { hidden: true } },
    {
      name: 'mediaDetails',
      type: 'ui',
      admin: {
        components: { Field: '/src/components/MediaDetails#MediaDetails' },
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (data && req.file) {
          if (req.headers.get('X-Story-Illustration') === '1') {
            try {
              await validateIllustrationFile(req.file.data, req.file.mimetype);
            } catch (error) {
              throw new ValidationError({ collection: 'media', errors: [{ path: 'file', message: error instanceof Error ? error.message : 'Invalid illustration dimensions.' }], req });
            }
          }
          if (!data.alt?.trim()) data.alt = altFromFilename(req.file.name);
          data.kind = kindFromMime(req.file.mimetype);
        }
        return data;
      },
    ],
    beforeChange: [
      ({ data, req, originalDoc }) => {
        if (
          originalDoc?.id &&
          originalDoc.processing !== 'ready' &&
          data.processing === 'ready' &&
          !req.context.processed
        )
          throw new Error(
            'Only the media worker can mark pending media ready.',
          );
        if (req.file) {
          if (originalDoc?.hash && !req.context.processed)
            throw new Error(
              'Media is immutable. Upload a new asset and update the story reference.',
            );
          if (req.file.size > 150 * 1024 * 1024)
            throw new Error('Maximum upload size is 150 MB');
          data.hash = createHash('sha256').update(req.file.data).digest('hex');
          data.processing = req.context.processed
            ? 'ready'
            : /^(video|audio)\//.test(req.file.mimetype)
              ? 'pending'
              : 'ready';
        }
        return data;
      },
    ],
  },
};
export const Tags: CollectionConfig = {
  slug: 'tags',
  access: protectedAccess,
  admin: { useAsTitle: 'identifier' },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.identifier) data.identifier = slugFromName(data.identifier);
        return data;
      },
    ],
  },
  fields: [
    { ...text('identifier', true), unique: true } as Field,
    { name: 'label', type: 'text', localized: true, required: true },
    media('icon'),
    { name: 'active', type: 'checkbox', defaultValue: true },
    num('order'),
  ],
};
const audioLibrary = (
  slug: 'background-music' | 'sound-effects',
  singular: string,
  plural: string,
): CollectionConfig => ({
  slug,
  labels: { singular, plural },
  access: protectedAccess,
  admin: {
    useAsTitle: 'name',
    group: 'Audio Library',
    defaultColumns: ['name', 'audio', 'updatedAt'],
    components: {
      edit: {
        beforeDocumentControls: [
          '/src/components/AudioLibraryDelete#AudioLibraryDeleteButton',
        ],
      },
    },
  },
  fields: [
    {
      ...text('name', true),
      admin: {
        components: {
          Cell: '/src/components/AudioLibraryDelete#AudioLibraryNameCell',
        },
      },
    },
    {
      ...media('audio', true),
      filterOptions: { mimeType: { contains: 'audio/' } },
      validate: async (value: any, { req }: any) => {
        if (!value) return 'Upload an audio file.';
        const file = await req.payload.findByID({
          collection: 'media',
          id: typeof value === 'object' ? value.id : value,
          overrideAccess: true,
        });
        return file.mimeType?.startsWith('audio/') || 'Choose an audio file.';
      },
    },
  ],
});
export const BackgroundMusic = audioLibrary(
  'background-music',
  'Music track',
  'Background Music',
);
export const SoundEffects = audioLibrary(
  'sound-effects',
  'Sound effect',
  'Sound Effects',
);
export const Categories: CollectionConfig = {
  slug: 'categories',
  access: protectedAccess,
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'active', 'order'] },
  fields: [
    text('name', true),
    { name: 'active', type: 'checkbox', defaultValue: true },
    num('order'),
  ],
};
export const Characters: CollectionConfig = {
  slug: 'characters',
  access: protectedAccess,
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'image', 'active'] },
  fields: [
    text('name', true),
    {
      ...media('image', true),
      filterOptions: { mimeType: { contains: 'image/' } },
      validate: async (value: any, { req }: any) => {
        if (!value) return 'Choose a character image.';
        const image = await req.payload.findByID({
          collection: 'media',
          id: typeof value === 'object' ? value.id : value,
          overrideAccess: true,
        });
        return (
          image.mimeType?.startsWith('image/') ||
          'Choose an image, not a video or audio file.'
        );
      },
    },
    { name: 'active', type: 'checkbox', defaultValue: true },
    num('order'),
  ],
};
export const Stories: CollectionConfig = {
  slug: 'stories',
  access: protectedAccess,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'updatedAt'],
  },
  versions: { maxPerDoc: 30 },
  fields: [
    { ...text('name', true), admin: { hidden: true } },
    row([
      { ...text('title'), label: 'Default Title' },
      {
        name: 'slug',
        type: 'text',
        required: true,
        unique: true,
        admin: { components: { Field: '/src/components/SlugField#SlugField' } },
      },
      {
        ...select('defaultLanguage', ['en', 'es', 'ka']),
        label: 'Default Language',
      },
    ]),
    { name: 'description', label: 'Default Description', type: 'textarea' },
    row([
      { ...media('defaultCover'), label: 'Default Cover' },
      {
        ...media('defaultThumbnail'),
        label: 'Default Thumbnail',
        filterOptions: { mimeType: { contains: 'image/' } },
        admin: {
          description: 'Image for story cards. If empty, the cover is used.',
        },
      },
    ]),
    row([
      select('status', ['draft', 'published', 'archived']),
      {
        name: 'publishedAt',
        type: 'date',
        admin: {
          date: { pickerAppearance: 'dayAndTime' },
          description: 'Editorial date only; Status controls publication.',
        },
      },
      num('minAge', 2),
      num('maxAge', 6),
      select('access', ['free', 'premium']),
    ]),
    row([
      {
        name: 'categories',
        type: 'relationship',
        relationTo: 'categories',
        hasMany: true,
        admin: { description: 'Choose all categories this story belongs to.' },
      },
      {
        name: 'characters',
        type: 'relationship',
        relationTo: 'characters',
        hasMany: true,
        admin: {
          description: 'Choose every character featured in this story.',
        },
      },
    ]),
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: { components: { Field: '/src/components/TagsField#TagsField' } },
    },
    {
      name: 'translations',
      label: 'Additional languages',
      labels: { singular: 'Language', plural: 'Languages' },
      type: 'array',
      admin: {
        description:
          'Add another language with its own title, description, cover and thumbnail.',
      },
      fields: [
        row([select('language', ['en', 'es', 'ka']), text('title')]),
        { name: 'description', type: 'textarea' },
        row([
          media('cover'),
          {
            ...media('thumbnail'),
            filterOptions: { mimeType: { contains: 'image/' } },
            admin: { description: 'Optional thumbnail for this language.' },
          },
        ]),
      ],
    },
    music,
    {
      name: 'pages',
      type: 'array',
      admin: {
        components: { RowLabel: '/src/components/PageRowLabel#PageRowLabel' },
        description:
          'Drag to reorder; use the row menu to duplicate or delete. Page IDs are stable.',
      },
      fields: [
        { ...text('name'), admin: { hidden: true } },
        row(
          [
            {
              ...media('illustration'),
              filterOptions: {
                or: [
                  { mimeType: { contains: 'image/' } },
                  { mimeType: { equals: 'video/mp4' } },
                ],
              },
              admin: {
                description:
                  'Choose one image or video. Videos use the story cover as their fallback image.',
              },
            },
            select('transition', ['fade', 'slide', 'none']),
            num('transitionMs', 300),
          ],
          'compact-row page-heading-row',
        ),
        {
          name: 'defaultNarration',
          label: 'Default language narration',
          type: 'group',
          fields: [
            ...narrationFields(),
            { ...media('illustration'), admin: { hidden: true } },
            { ...media('video'), admin: { hidden: true } },
          ],
        },
        { ...media('video'), admin: { hidden: true } },
        { ...media('poster'), admin: { hidden: true } },
        { ...select('fit', ['contain', 'cover']), admin: { hidden: true } },
        { ...select('layout', ['below', 'overlay']), admin: { hidden: true } },
        {
          type: 'collapsible',
          label: 'Background Music',
          admin: { initCollapsed: true },
          fields: [{ ...music, label: false }],
        },
        {
          type: 'collapsible',
          label: 'Sound Effects',
          admin: { initCollapsed: true },
          fields: [
            {
              name: 'effects',
              label: false,
              type: 'array',
              fields: [
                row(
                  [
                    {
                      ...media('asset', true),
                      filterOptions: { mimeType: { contains: 'audio/' } },
                    },
                    num('atMs'),
                    {
                      name: 'volume',
                      type: 'number',
                      min: 0,
                      max: 1,
                      defaultValue: 0.5,
                    },
                    { name: 'animation', type: 'checkbox', defaultValue: true },
                    num('durationMs'),
                  ],
                  'compact-row sound-effects-row',
                ),
              ],
            },
          ],
        },
        {
          name: 'translations',
          label: 'Additional narration languages',
          labels: { singular: 'Language', plural: 'Languages' },
          type: 'array',
          fields: [
            select('language', ['en', 'es', 'ka']),
            ...narrationFields(),
            {
              ...media('illustration'),
              label: 'Localized illustration (optional)',
              filterOptions: {
                or: [
                  { mimeType: { contains: 'image/' } },
                  { mimeType: { equals: 'video/mp4' } },
                ],
              },
              admin: {
                description:
                  'Optional image or video override for this language.',
              },
            },
            { ...media('video'), admin: { hidden: true } },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Story Quiz',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'quiz',
          label: 'Questions',
          type: 'array',
          maxRows: 50,
          labels: { singular: 'Question', plural: 'Questions' },
          admin: {
            description:
              'Leave answers empty for an open-ended question, or add 2–6 answers with exactly one correct answer. Questions are shown in this order in every story language.',
          },
          fields: [
            { name: 'question', type: 'textarea', required: true },
            {
              name: 'answers',
              type: 'array',
              maxRows: 6,
              labels: { singular: 'Answer', plural: 'Answers' },
              admin: {
                components: {
                  beforeInput: [
                    '/src/components/QuizCorrectAnswer#QuizAnswerSelection',
                  ],
                },
              },
              validate: (value: any) => {
                if (
                  value == null ||
                  (Array.isArray(value) && value.length === 0)
                )
                  return true;
                if (
                  !Array.isArray(value) ||
                  value.length < 2 ||
                  value.length > 6
                )
                  return 'Add between 2 and 6 answers.';
                if (value.some((a: any) => !a.text?.trim()))
                  return 'Every answer needs text.';
                return (
                  value.filter((a: any) => a.correct).length === 1 ||
                  'Mark exactly one correct answer.'
                );
              },
              fields: [
                row([
                  {
                    name: 'text',
                    label: 'Answer',
                    type: 'text',
                    required: true,
                  },
                  {
                    name: 'correct',
                    label: 'Correct answer',
                    type: 'checkbox',
                    defaultValue: false,
                    admin: {
                      components: {
                        Field:
                          '/src/components/QuizCorrectAnswer#QuizCorrectAnswer',
                      },
                    },
                  },
                ]),
              ],
            },
            {
              name: 'explanation',
              label: 'Explanation (optional)',
              type: 'textarea',
              admin: {
                description: 'Shown after the child checks their answer.',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'previewHelp',
      type: 'ui',
      admin: {
        components: { Field: '/src/components/PreviewLink#PreviewLink' },
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (data) {
          const merged = normalizeStoryMetadata({ ...originalDoc, ...data });
          data.name =
            merged.title?.trim() ||
            merged.name ||
            merged.slug ||
            'Untitled story';
          data.pages?.forEach((page: { name?: string }, index: number) => {
            if (!page.name?.trim()) page.name = `page_${index + 1}`;
          });
          const durations = new Map<string, number>();
          for (const page of [
            data.coverPage,
            ...(data.pages ?? []),
            data.endPage,
          ].filter(Boolean)) {
            for (const narration of [
              page.defaultNarration,
              ...(page.translations ?? []),
            ]) {
              if (!narration) continue;
              const id = narration.narration?.id ?? narration.narration;
              if (!id) {
                narration.durationMs = 0;
                continue;
              }
              if (!durations.has(String(id))) {
                const media = await req.payload.findByID({
                  collection: 'media',
                  id,
                  depth: 0,
                  req,
                });
                durations.set(
                  String(id),
                  media.processing === 'ready'
                    ? Math.round(media.durationMs ?? 0)
                    : 0,
                );
              }
              narration.durationMs = durations.get(String(id));
            }
          }
        }
        return data;
      },
    ],
    afterRead: [
      ({ doc }) =>
        normalizePageNarration(
          normalizePageVisuals(normalizeStoryMetadata(doc)),
        ),
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const merged = normalizePageNarration(
          normalizeStoryMetadata({ ...originalDoc, ...data }),
        );
        for (const key of [
          'defaultLanguage',
          'title',
          'description',
          'defaultCover',
          'defaultThumbnail',
          'translations',
          'pages',
        ])
          data[key] = merged[key];
        const invalid = (path: string, message: string): never => {
          throw new ValidationError({
            collection: 'stories',
            errors: [{ path, message }],
            req,
          });
        };
        if (merged.minAge > merged.maxAge)
          invalid('minAge', 'Minimum age must not exceed maximum age');
        if (
          new Set(storyMetadataLanguages(merged).map((t: any) => t.language))
            .size !== storyMetadataLanguages(merged).length
        )
          invalid('translations', 'Each story language may appear only once.');
        const languagePages = [
          { page: merged.coverPage, path: 'coverPage', label: 'Cover Page' },
          ...(merged.pages ?? []).map((page: any, index: number) => ({
            page,
            path: `pages.${index}`,
            label: `Page ${index + 1}`,
          })),
          { page: merged.endPage, path: 'endPage', label: 'The End Page' },
        ];
        for (const { page, path, label } of languagePages) {
          if (!page) continue;
          if (
            new Set(
              pageNarrationLanguages(page, merged.defaultLanguage).map(
                (t: any) => t.language,
              ),
            ).size !==
            pageNarrationLanguages(page, merged.defaultLanguage).length
          )
            invalid(
              `${path}.translations`,
              `${label}: duplicate language rows.`,
            );
        }
        data.updatedAt = new Date(
          Math.max(
            Date.now(),
            Date.parse(originalDoc?.updatedAt ?? '') + 1 || 0,
          ),
        ).toISOString();
        merged.updatedAt = data.updatedAt;
        data.publishedAt = publicationDate(
          merged.status,
          data.publishedAt,
          originalDoc?.publishedAt,
          data.updatedAt,
        );
        if (merged.status === 'published') {
          try {
            const story = await toStory(merged, req.payload, true);
            if (!Object.keys(story.translations).length)
              throw new Error(
                'No complete story language. Every page needs text, ready narration and valid timings.',
              );
            for (const t of storyMetadataLanguages(merged)) {
              const m = story.translations[t.language as 'en'];
              if (!m)
                throw new Error(
                  `Language ${t.language} is incomplete. Check every page and media processing status.`,
                );
              validatePublished(m.manifest);
            }
          } catch (error) {
            invalid(
              'status',
              `Cannot publish yet. ${error instanceof Error ? error.message : String(error)} Choose Draft to save unfinished work.`,
            );
          }
        }
        return data;
      },
    ],
  },
};
export const Homes: CollectionConfig = {
  slug: 'homes',
  access: protectedAccess,
  admin: { useAsTitle: 'name' },
  fields: [
    {
      name: 'catalogMatrix',
      type: 'ui',
      admin: { components: { Field: '/src/components/HomeMatrix#HomeMatrix' } },
    },
    text('name', true),
    { name: 'active', type: 'checkbox', defaultValue: true },
    {
      name: 'countries',
      type: 'text',
      hasMany: true,
      admin: {
        description:
          'ISO country codes, e.g. US, ES. Empty for global fallback.',
      },
    },
    {
      name: 'channels',
      type: 'select',
      hasMany: true,
      options: ['web', 'mobile', 'unity'],
      defaultValue: ['web', 'mobile', 'unity'],
    },
    { name: 'fallback', type: 'checkbox' },
    num('priority'),
    {
      name: 'include',
      type: 'relationship',
      relationTo: 'stories',
      hasMany: true,
    },
    {
      name: 'exclude',
      type: 'relationship',
      relationTo: 'stories',
      hasMany: true,
    },
    {
      name: 'entries',
      type: 'array',
      fields: [
        {
          name: 'story',
          type: 'relationship',
          relationTo: 'stories',
          required: true,
        },
        { name: 'access', type: 'select', options: ['free', 'premium'] },
        { name: 'featured', type: 'checkbox' },
        num('order'),
      ],
    },
  ],
};

// Bookends use the same illustration, music and sound controls as story pages,
// with optional voice-over uploads instead of text and word synchronization.
const storyPages = Stories.fields.find(
  (field) => 'name' in field && field.name === 'pages',
);
if (storyPages?.type === 'array') {
  const voiceOverFields = (): Field[] => [
    {
      ...media('narration'),
      label: 'Voice over',
      filterOptions: { mimeType: { contains: 'audio/' } },
    },
    { ...num('durationMs'), admin: { hidden: true } },
    { ...num('delayMs'), label: 'Delay Ms' },
  ];
  const bookend = (name: string, label: string): Field => ({
    label,
    type: 'collapsible',
    admin: { initCollapsed: true },
    fields: [
      {
        name,
        label: false,
        type: 'group',
        fields: storyPages.fields
          .filter(
            (field) =>
              !(
                'name' in field &&
                ['name', 'video', 'poster', 'fit', 'layout'].includes(
                  field.name,
                )
              ),
          )
          .map((field): Field => {
            if ('name' in field && field.name === 'defaultNarration')
              return {
                name: 'defaultNarration',
                label: 'Default language voice over',
                type: 'group',
                fields: voiceOverFields(),
              };
            if (field.type === 'array' && field.name === 'translations')
              return {
                ...field,
                fields: [
                  select('language', ['en', 'es', 'ka']),
                  ...voiceOverFields(),
                  {
                    ...media('illustration'),
                    label: 'Localized illustration (optional)',
                    filterOptions: {
                      or: [
                        { mimeType: { contains: 'image/' } },
                        { mimeType: { equals: 'video/mp4' } },
                      ],
                    },
                  },
                ],
              };
            return field;
          }),
      },
    ],
  });
  const index = Stories.fields.indexOf(storyPages);
  Stories.fields.splice(index, 0, bookend('coverPage', 'Cover Page'));
  Stories.fields.splice(index + 2, 0, bookend('endPage', 'The End Page'));
}

// Apply to every media relationship, including nested page and language fields.
function directMediaUploads(fields: Field[]) {
  for (const field of fields) {
    if (field.type === 'upload' && field.relationTo === 'media') {
      field.admin = {
        ...field.admin,
        allowCreate: false,
        className: [field.admin?.className, 'direct-media-upload']
          .filter(Boolean)
          .join(' '),
        components: {
          ...field.admin?.components,
          beforeInput: ['/src/components/MediaBrowse#MediaBrowse'],
        },
      };
    }
    if ('fields' in field) directMediaUploads(field.fields);
  }
}
for (const collection of [
  Media,
  Tags,
  Characters,
  Stories,
  Homes,
  BackgroundMusic,
  SoundEffects,
])
  directMediaUploads(collection.fields);
