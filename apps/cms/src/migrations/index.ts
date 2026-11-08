import * as migration_20261107_063814_initial from './20261107_063814_initial';
import * as migration_20261107_070543_media_metadata from './20261107_070543_media_metadata';
import * as migration_20261107_075038_story_editor_timestamps from './20261107_075038_story_editor_timestamps';
import * as migration_20261107_080413_automatic_media_fields from './20261107_080413_automatic_media_fields';
import * as migration_20261107_081321_story_thumbnails from './20261107_081321_story_thumbnails';
import * as migration_20261107_101355_draft_content_optional from './20261107_101355_draft_content_optional';
import * as migration_20261107_101811_default_story_language from './20261107_101811_default_story_language';
import * as migration_20261107_102646_default_page_narration from './20261107_102646_default_page_narration';
import * as migration_20261107_105953_elevenlabs_narration from './20261107_105953_elevenlabs_narration';
import * as migration_20261107_191121_story_taxonomy from './20261107_191121_story_taxonomy';
import * as migration_20261108_061038_audio_libraries from './20261108_061038_audio_libraries';
import * as migration_20261108_074157_bookend_pages from './20261108_074157_bookend_pages';
import * as migration_20261108_082201_story_quiz from './20261108_082201_story_quiz';
import * as migration_20261108_110802_parental_center from './20261108_110802_parental_center';

export const migrations = [
  {
    up: migration_20261107_063814_initial.up,
    down: migration_20261107_063814_initial.down,
    name: '20261107_063814_initial',
  },
  {
    up: migration_20261107_070543_media_metadata.up,
    down: migration_20261107_070543_media_metadata.down,
    name: '20261107_070543_media_metadata',
  },
  {
    up: migration_20261107_075038_story_editor_timestamps.up,
    down: migration_20261107_075038_story_editor_timestamps.down,
    name: '20261107_075038_story_editor_timestamps',
  },
  {
    up: migration_20261107_080413_automatic_media_fields.up,
    down: migration_20261107_080413_automatic_media_fields.down,
    name: '20261107_080413_automatic_media_fields',
  },
  {
    up: migration_20261107_081321_story_thumbnails.up,
    down: migration_20261107_081321_story_thumbnails.down,
    name: '20261107_081321_story_thumbnails',
  },
  {
    up: migration_20261107_101355_draft_content_optional.up,
    down: migration_20261107_101355_draft_content_optional.down,
    name: '20261107_101355_draft_content_optional',
  },
  {
    up: migration_20261107_101811_default_story_language.up,
    down: migration_20261107_101811_default_story_language.down,
    name: '20261107_101811_default_story_language',
  },
  {
    up: migration_20261107_102646_default_page_narration.up,
    down: migration_20261107_102646_default_page_narration.down,
    name: '20261107_102646_default_page_narration',
  },
  {
    up: migration_20261107_105953_elevenlabs_narration.up,
    down: migration_20261107_105953_elevenlabs_narration.down,
    name: '20261107_105953_elevenlabs_narration',
  },
  {
    up: migration_20261107_191121_story_taxonomy.up,
    down: migration_20261107_191121_story_taxonomy.down,
    name: '20261107_191121_story_taxonomy',
  },
  {
    up: migration_20261108_061038_audio_libraries.up,
    down: migration_20261108_061038_audio_libraries.down,
    name: '20261108_061038_audio_libraries',
  },
  {
    up: migration_20261108_074157_bookend_pages.up,
    down: migration_20261108_074157_bookend_pages.down,
    name: '20261108_074157_bookend_pages',
  },
  {
    up: migration_20261108_082201_story_quiz.up,
    down: migration_20261108_082201_story_quiz.down,
    name: '20261108_082201_story_quiz',
  },
  {
    up: migration_20261108_110802_parental_center.up,
    down: migration_20261108_110802_parental_center.down,
    name: '20261108_110802_parental_center'
  },
];
