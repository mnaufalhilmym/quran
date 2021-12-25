<script context="module" lang="ts">
	export async function load({ page }) {
		return {
			props: {
				slug: page.params.slug
			}
		};
	}
</script>

<script lang="ts">
	import Page from '$lib/Page.svelte';
	export let slug: string;
</script>

<Page {slug} />
