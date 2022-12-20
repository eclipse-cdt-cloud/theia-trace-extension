<script>
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
</script>

<div class="app">
	<Header />

	<main>
		<div class="content">
			<Sidebar />
			<div class="inner-page">
				<slot />
			</div>
		</div>
	</main>

	<footer>
		<p>
			<a href="https://github.com/eclipse-cdt-cloud/theia-trace-extension">Theia Trace Extension</a>
		</p>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: row;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.inner-page {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
