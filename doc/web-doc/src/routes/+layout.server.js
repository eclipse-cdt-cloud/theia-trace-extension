import { getAdrsContent } from '$lib/process-files';

export async function load() {
	const adrs = await getAdrsContent();

	return { adrs };
}
