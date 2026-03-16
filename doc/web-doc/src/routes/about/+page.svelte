<svelte:head>
	<title>About</title>
	<meta name="description" content="About this app" />
</svelte:head>

<div class="text-column">
	<h1>About Theia Trace Extension</h1>

	<p>
		Theia trace viewer extension using the <a
			target="_blank"
			rel="noopener noreferrer"
			href="https://github.com/eclipse-cdt-cloud/tsp-typescript-client">tsp-typescript-client</a
		>
		and
		<a
			target="_blank"
			rel="noopener noreferrer"
			href="https://github.com/eclipse-cdt-cloud/trace-server-protocol">Trace Server Protocol</a
		>.
	</p>

	<p>
		The diagram below shows the main parts of the Trace Viewer's front end (left side) and back end
		(right side), as well as how they exchange information.
	</p>

	<p>
		<img
			src="https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-viewer-architecture.PNG"
			alt="Trace viewer architecture diagram"
		/>
	</p>

	<p>
		Source: <a
			target="_blank"
			rel="noopener noreferrer"
			href="https://www.eclipsecon.org/sites/default/files/slides/EclipseCon2021-TraceCompassCloud.pdf"
			>EclipseCon 2021 Presentation (slide 18)</a
		>, Bernd Hufmann
	</p>
</div>

<style>
	.text-column {
		text-align: center;
		padding: 0 1em;
	}

	img {
		width: 100%;
	}
</style>
