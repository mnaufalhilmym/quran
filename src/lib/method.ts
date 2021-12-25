export async function getData(path: string) {
	try {
		return await (
			await fetch(`${path}`, {
				method: 'GET'
			})
		).json();
	} catch (error: any) {
		throw new Error(error);
	}
}
