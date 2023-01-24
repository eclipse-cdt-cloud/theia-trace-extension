<script>
	import tteImage from '$lib/images/theia-trace-extension-0.0.3.png';

	export let data;
	let { adrs } = data;
</script>

<div class="text-column">
	<h1>Welcome to Theia Trace Extension</h1>

	<img src={tteImage} alt="Trace Compass" />

	<h2>ADRs (Architecture Decision Records)</h2>

	<div class="adrs">
		{#each adrs as adr}
			<p><a href="/adr/{adr.slug}">{adr.slug}</a></p>
		{/each}
	</div>
</div>

<style>
	.text-column {
		text-align: center;
		padding: 0 1em;
	}

	img {
		width: 40em;
	}

	.adrs {
		width: 30em;
		margin: 0 auto;
		text-align: left;
	}
</style>
