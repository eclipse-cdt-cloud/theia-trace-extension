import fs from 'fs-extra';
import { compareSync } from 'dir-compare';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

const src = '../adr/';
const dest = 'doc-sources/adr-source/';

const errorCallback = (err) => {
	if (err) throw err;
};

const comparisonOptions = {
	excludeFilter: '.DS_Store',
	compareSize: true,
	compareContent: true
};

// Sanitizer of markdown files

const sanitizer = (chunk) => {
	return chunk.replace(/{/g, '&#123;').replace(/}/g, '&#125;');
};

const processLineByLine = async (file) => {
	try {
		let result = '';
		let mermaid = false;
		let mermaidBlock = '';

		const rl = createInterface({
			input: file,
			crlfDelay: Infinity
		});

		rl.on('line', (line) => {
			if (mermaid) {
				mermaidBlock += line + '\n';

				if (line.includes('```')) {
					mermaid = false;
					result += sanitizer(mermaidBlock);
					mermaidBlock = '';
				}
			} else {
				result += line + '\n';
			}

			if (line.includes('```mermaid')) {
				mermaid = true;
			}
		});

		await once(rl, 'close');

		return result;
	} catch (err) {
		console.error(err);
	}
};

// Compare folders

if (!fs.existsSync('doc-sources')) {
	fs.mkdirSync('doc-sources');
	fs.mkdirSync(dest);
} else if (!fs.existsSync(dest)) {
	fs.mkdirSync(dest);
}

const comparison = compareSync(src, dest, comparisonOptions);

// Copy missing files and folders

if (!comparison.same) {
	comparison.diffSet.forEach(async (dif) => {
		if ((dif.state === 'left' || dif.state === 'distinct') && dif.path1 === src) {
			if (dif.type1 === 'file' && dif.name1.slice(-3) === '.md') {
				// Remove outdated file
				if (dif.state === 'distinct') {
					fs.rmSync(dest + dif.name2, { force: true });
				}

				// Sanitize Markdown files
				const file = fs.createReadStream(src + dif.name1, 'utf8');
				const sanitized = await processLineByLine(file);
				fs.writeFileSync(dest + dif.name1, sanitized.toString());
			} else {
				// Copy
				fs.copySync(src + dif.name1, dest + dif.name1, { recursive: true }, errorCallback);
			}
		}
	});
}
