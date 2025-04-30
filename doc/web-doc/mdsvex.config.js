import remarkMermaid from '@ysuzuki19/remark-mermaid';

const config = {
	extensions: ['.svelte.md', '.md', '.svx'],

	smartypants: {
		dashes: 'oldschool'
	},

	remarkPlugins: [remarkMermaid],
	rehypePlugins: []
};

export default config;
