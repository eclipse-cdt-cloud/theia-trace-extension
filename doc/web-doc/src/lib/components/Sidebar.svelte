<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	export let adrs;
	let showAdrs = false;
</script>

<div class="sidebar">
	<ul>
		<li aria-current={$page.url.pathname === '/' ? 'page' : undefined}>
			<button on:click={() => goto('/')}>Home</button>
		</li>
		<li aria-current={$page.url.pathname === '/about' ? 'page' : undefined}>
			<button on:click={() => goto('/about')}>About</button>
		</li>
		<li>
			<button class:selected={showAdrs} on:click={() => (showAdrs = !showAdrs)}>ADRs</button>
		</li>
		{#if showAdrs}
			{#each adrs as adr}
				<li aria-current={$page.url.pathname === '/adr/' + adr.slug ? 'page' : undefined}>
					<button class="adr">
						<a href={'/adr/' + adr.slug} target="_self">
							<div class="link-holder">{adr.slug}</div>
						</a>
					</button>
				</li>
			{/each}
		{/if}
	</ul>
</div>

<style>
	.sidebar {
		width: 10em;
		min-width: 10em;
	}

	ul {
		padding: 0;
	}

	li {
		height: 3em;
		list-style: none;
	}

	button {
		width: 100%;
		height: 100%;
	}

	button.adr {
		display: flex;
		padding: 0;
	}

	button.adr a {
		width: 100%;
		height: 100%;
		display: flex;
		color: black;
		text-decoration: none;
	}

	button.adr a:visited,
	button.adr a:link,
	button.adr a:focus {
		color: black;
	}

	button.selected {
		background: lightgrey;
		border-width: 0;
	}

	button:hover {
		cursor: pointer;
	}

	.link-holder {
		margin: auto;
	}
</style>
