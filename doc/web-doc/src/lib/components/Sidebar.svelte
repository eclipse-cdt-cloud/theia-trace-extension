<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
</script>

<div class="sidebar">
	<ul>
		<li aria-current={$page.url.pathname === '/' ? 'page' : undefined}>
			<button on:click={() => goto('/')}>Home</button>
		</li>
		<li aria-current={$page.url.pathname === '/about' ? 'page' : undefined}>
			<button on:click={() => goto('/about')}>About</button>
		</li>
	</ul>
</div>

<style>
	.sidebar {
		width: 10em;
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
		background: none;
	}
</style>
