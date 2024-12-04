<script>
	import mermaid from 'mermaid';
	import { onMount } from 'svelte';

	export let data;
	let { adrs, slug } = data;

	const adr = adrs.filter((adr) => adr.slug === slug);
	const content = adr[0].content.html;
	const githubLink =
		'https://github.com/eclipse-cdt-cloud/theia-trace-extension/blob/master/doc/adr/' +
		slug +
		'.md';

	mermaid.initialize({
		startOnLoad: false,
		theme: 'default'
	});

	onMount(() => {
		mermaid.init();
	});
</script>

<div class="adr">
	<div class="github-link">
		<a target="_blank" rel="noopener noreferrer" href={githubLink}>Read this on GitHub</a>
	</div>

	{@html content}
</div>

<style>
	.adr {
		margin: 0 1em;
	}

	.github-link {
		text-align: right;
	}
</style>
