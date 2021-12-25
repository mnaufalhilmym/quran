export function setItem(key: string, data: string) {
	localStorage.setItem(key, data);
}

export function getItem(key: string) {
	return localStorage.getItem(key);
}
