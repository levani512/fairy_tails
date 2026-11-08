import { expect, it } from 'vitest';
import { phoneNotchSide } from '../apps/client/src/reader-safe-area';

it('keeps the notch side protected in either iPhone landscape orientation', () => {
  expect(phoneNotchSide(90, 874, 402)).toBe('left');
  expect(phoneNotchSide(-90, 874, 402)).toBe('right');
  expect(phoneNotchSide(270, 874, 402)).toBe('right');
});

it('keeps both safe margins for portrait, unknown orientation and rotation transitions', () => {
  expect(phoneNotchSide(0, 402, 874)).toBeNull();
  expect(phoneNotchSide(90, 402, 874)).toBeNull();
  expect(phoneNotchSide(0, 874, 402)).toBeNull();
  expect(phoneNotchSide(undefined, 874, 402)).toBeNull();
});
