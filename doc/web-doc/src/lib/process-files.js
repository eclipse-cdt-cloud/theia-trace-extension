const allAdrFiles = import.meta.glob('/doc-sources/adr-source/*.md');
const iterableAdrFiles = Object.entries(allAdrFiles);

export const getAdrsContent = async () => {
	const allAdrs = await Promise.all(
		iterableAdrFiles.map(async ([path, resolver]) => {
			const element = await resolver();
			const metadata = element.metadata;
			const content = element.default.render();
			const slug = path.slice(0, -3).split('/').pop();

			return {
				metadata,
				slug,
				path,
				content
			};
		})
	);

	return allAdrs;
};

export const getAdr = async (slug) => {
	const adr = iterableAdrFiles?.filter(([path]) => {
		const fileSlug = path.slice(0, -3).split('/').pop();

		return fileSlug === slug;
	});

	if (adr.length > 0) {
		const resolver = adr[0][1];
		const element = await resolver();
		console.log('resolver', element);
		//   const content = element.default.render()

		//   return content
	}

	return adr;
};

export const getOneAdr = async (slug) => {
	const allAdrs = await Promise.all(
		iterableAdrFiles.map(async ([path, resolver]) => {
			const fileSlug = path.slice(0, -3).split('/').pop();
			let content = 'empty';
			if (fileSlug === slug) {
				console.log('equal', slug, path, resolver);
				const element = await resolver();
				content = element.default.render();
			}

			return {
				content
			};
		})
	);

	console.log('all adrs', allAdrs);
	return allAdrs;
};
