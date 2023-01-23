import fs from 'node:fs';
// import path from 'node:path';
// import { fileURLToPath } from 'node:url'
import test from 'ava'
import { execa } from 'execa'
// import { temporaryDirectoryTask } from 'tempy'
// import compareSize from 'compare-size'
import webpmux from '../index.js'

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)))

test('return path to binary and verify that it is working', async t => {
  const { stdout, stderr } = await execa(webpmux, ['-version'])
	t.true(stderr.length === 0)
  t.true(stdout === pkg.libwebp_version)
	// t.true(stdout.trim().test(/^\d+\.\d+\.\d+$/))
})

// test('assembles APNG from separate frame files', async t => {
// 	const [dest, expected, result] = await temporaryDirectoryTask(async (temporary) => {
// 		const src = fileURLToPath(new URL('fixtures/input-separate-frame*.png', import.meta.url));
// 		const expected = fileURLToPath(new URL('fixtures/expected-separate.png', import.meta.url));
// 		const dest = path.join(temporary, 'output-separate.png');
// 		const args = [
// 			dest,
// 			src
// 		];

// 		await execa(apngasm, args);
// 		return [
// 			dest,
// 			expected,
// 			await compareSize(expected, dest)
// 		];
// 	});

// 	t.true(result[dest] > 0);
// 	t.true(result[dest] === result[expected]);
// });

// test('assembles APNG from single strip file', async t => {
// 	const [dest, expected, result] = await temporaryDirectoryTask(async (temporary) => {
// 		const src = fileURLToPath(new URL('fixtures/input-strip.png', import.meta.url));
// 		const expected = fileURLToPath(new URL('fixtures/expected-strip.png', import.meta.url));
// 		const dest = path.join(temporary, 'output-strip.png');
// 		const args = [
// 			dest,
// 			src,
// 			1,
// 			24,
// 			'-hs29'
// 		];

// 		await execa(apngasm, args);
// 		return [
// 			dest,
// 			expected,
// 			await compareSize(expected, dest)
// 		];
// 	});

// 	t.true(result[dest] > 0);
// 	t.true(result[dest] === result[expected]);
// });
