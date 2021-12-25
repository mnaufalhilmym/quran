<script lang="ts">
	import { onMount } from 'svelte';
	import { getData } from './method';
	import { getItem, setItem } from './storage';
	export let slug = '';

	let mounted = false;

	let windowProps = {
		initW: 0,
		w: 0,
		h: 0,
		col: 0,
		initPointer: { x: 0, y: 0 },
		fs: false,
		fsChange: false
	};

	let pageProps = {
		rightEl: { scrollWidth: 0, scrollHeight: 0 },
		singleEl: { scrollWidth: 0, scrollHeight: 0 },
		rPage: '004',
		lPage: '005',
		sPage: '004',
		arrow: true,
		showNav: false
	};

	let modal = { top: '', bottom: '' };

	let data = { juz: [], chapter: [], verse: [], page: [] };

	let loc = { juz: 'memuat', chapter: 'memuat', verse: 'memuat', page: 'memuat' };

	let filter = { chapter: '', verse: '', page: '' };

	onMount(() => {
		setScreenSize();
		windowProps.initW = innerWidth;

		let page: number;
		if (slug) {
			page = Number(slug);
			if (page < 1) {
				page = 1;
			} else if (page > 604) {
				page = 604;
			}
		} else {
			page = Number(getItem('page'));
			if (!page || page < 1) {
				page = 1;
			} else if (page > 604) {
				page = 604;
			}
		}
		document.title = `Qur'an · Halaman ${page}`;
		history.replaceState({ url: `/${page}` }, `Qur'an · Halaman ${page}`, `/${page}`);

		windowProps.col = Number(getItem('viewColumn'));
		if (!windowProps.col) {
			windowProps.col = 2;
		}
		if (windowProps.w < windowProps.h) {
			windowProps.col = 1;
		}
		if (windowProps.w < 640) {
			pageProps.arrow = false;
		}

		setInitPage(page + 3);

		mounted = true;

		(async () => {
			await getJuzData();
			await getChapterData();
			await getPageData();
			setIndicator();
			await getVerseData();
		})();
	});

	function setScreenSize() {
		windowProps.w = innerWidth;
		windowProps.h = innerHeight;
		if (document.fullscreenElement) {
			windowProps.fs = true;
		} else {
			windowProps.fs = false;
		}
	}

	async function getJuzData(juz?: string) {
		if (!juz) {
			data.juz = (await getData('https://api.quran.com/api/v4/juzs')).juzs;
		}
	}

	async function getChapterData(chapter?: string) {
		if (!chapter) {
			data.chapter = (await getData('https://api.quran.com/api/v4/chapters?language=id')).chapters;
		}
	}

	async function getVerseData(verse?: string) {
		if (!verse) {
			let chapters: Array<string | number> = loc.chapter.split(' - ');
			for (let i = 0; i < chapters.length; ++i) {
				chapters[i] = Number((chapters[i] as string).split('. ')[0]);
			}
			data.verse = [];
			for (
				let l = chapters[0], u = chapters[1] ? chapters[1] : chapters[0];
				l <= u;
				++(l as number)
			) {
				data.verse.push({
					chapter: l as number,
					verses: Array.from(
						{ length: data.chapter[(l as number) - 1]['verses_count'] },
						(_, i) => i + 1
					)
				});
			}
		}
	}

	async function getPageData(page?: string) {
		if (!page) {
			data.page = Array.from({ length: 604 }, (_, i) => i + 1);
		}
	}

	function setInitPage(page: number) {
		switch (windowProps.col) {
			case 1:
				pageProps.sPage = setPageNumber(page, 0);
				break;
			case 2:
				if (page % 2 === 0) {
					pageProps.rPage = setPageNumber(page, 0);
					pageProps.lPage = setPageNumber(page, 1);
				} else {
					pageProps.lPage = setPageNumber(page, 0);
					pageProps.rPage = setPageNumber(page, -1);
				}
				break;
		}
	}

	function setPageNumber(page: number, addition: number) {
		let pageNumber = String(page + addition);
		let digit = pageNumber.length;
		while (digit++ < 3) {
			pageNumber = '0' + pageNumber;
		}
		return pageNumber;
	}

	function pushHistory(page: number) {
		setItem('page', String(page));
		document.title = `Qur'an · Halaman ${page}`;
		history.pushState({ url: `/${page}` }, `Qur'an · Halaman ${page}`, `/${page}`);
	}

	function changePage(direction: string) {
		switch (windowProps.col) {
			case 1:
				if (
					Number(pageProps.sPage) < 4 ||
					Number(pageProps.sPage) > 607 ||
					(Number(pageProps.sPage) === 4 && direction === 'back') ||
					(Number(pageProps.sPage) === 607 && direction === 'next')
				) {
					return;
				}
				break;
			case 2:
				if (
					Number(pageProps.rPage) < 4 ||
					Number(pageProps.lPage) > 607 ||
					(Number(pageProps.rPage) === 4 && direction === 'back') ||
					(Number(pageProps.lPage) === 607 && direction === 'next')
				) {
					return;
				}
				break;
		}

		let addition = 1;
		if (direction === 'back') {
			addition *= -1;
		}
		if (windowProps.col === 2) {
			addition *= 2;
		}

		let page: number;
		switch (windowProps.col) {
			case 1:
				pageProps.sPage = setPageNumber(Number(pageProps.sPage), addition);
				page = Number(pageProps.sPage) - 3;
				break;
			case 2:
				pageProps.rPage = setPageNumber(Number(pageProps.rPage), addition);
				pageProps.lPage = setPageNumber(Number(pageProps.lPage), addition);
				page = Number(pageProps.rPage) - 3;
				break;
		}
		setIndicator();
		pushHistory(page);
	}

	function toggleModalState(type?: string, which?: string) {
		function disableModal(which?: string) {
			filter.chapter = '';
			filter.page = '';
			pageProps.showNav = false;
			switch (which) {
				case 'top':
					modal.top = '';
					break;
				case 'bottom':
					modal.bottom = '';
					break;
				default:
					modal.top = '';
					modal.bottom = '';
			}
			return;
		}
		if (!type) {
			disableModal();
		}

		function enableModal() {
			switch (which) {
				case 'top':
					disableModal('bottom');
					modal.top = type;
					break;

				case 'bottom':
					disableModal('top');
					modal.bottom = type;
					break;
			}
		}

		if (!(modal.top || modal.bottom)) {
			enableModal();
		} else if (modal.top !== type && modal.bottom !== type) {
			enableModal();
		} else if (modal.top === type && modal.bottom === type) {
			disableModal();
		}
	}

	async function setJuz(juzId: number) {
		toggleModalState();
		const d = data.juz[juzId - 1]['verse_mapping'];
		const chapter = Object.keys(d)[0];
		const verse = (d[chapter] as string).split('-')[0];
		const page = (await getData(`https://api.quran.com/api/v4/verses/by_key/${chapter}:${verse}`))[
			'verse'
		]['page_number'];
		setInitPage(page + 3);
		setIndicator();
		pushHistory(page);
	}

	async function setChapter(chapterId: number) {
		toggleModalState();
		const page = data.chapter[chapterId - 1]['pages'][0];
		setInitPage(page + 3);
		setIndicator();
		pushHistory(page);
	}

	async function setPage(page: number) {
		toggleModalState();
		setInitPage(page + 3);
		setIndicator();
		pushHistory(page);
	}

	async function setVerse(chapter: number, verse: number) {
		toggleModalState();
		const page = (await getData(`https://api.quran.com/api/v4/verses/by_key/${chapter}:${verse}`))[
			'verse'
		]['page_number'];
		setInitPage(page + 3);
		setIndicator();
		pushHistory(page);
	}

	function setViewColumn(col: number) {
		windowProps.col = col;
		switch (col) {
			case 1:
				pageProps.sPage = pageProps.rPage;
				break;
			case 2:
				setInitPage(Number(pageProps.sPage));
				break;
		}
		setIndicator();
		setItem('viewColumn', `${windowProps.col}`);
	}

	async function setIndicator() {
		switch (windowProps.col) {
			case 1:
				const page = Number(pageProps.sPage) - 3;

				(async () => {
					for (let i = 0; i < data.chapter.length; ++i) {
						let firstPage = Number(data.chapter[i].pages[1]);
						if (firstPage >= page) {
							loc.chapter = `${data.chapter[i]['id']}. ${data.chapter[i]['name_simple']}`;

							for (++i; i < data.chapter.length; ++i) {
								if (i === data.chapter.length - 1) {
									loc.chapter += ` - ${data.chapter[i]['id']}. ${data.chapter[i]['name_simple']}`;
									break;
								}

								firstPage = Number(data.chapter[i].pages[0]);
								if (firstPage > page) {
									const chapterName = `${data.chapter[i - 1]['id']}. ${
										data.chapter[i - 1]['name_simple']
									}`;
									if (chapterName !== loc.chapter) {
										loc.chapter += ` - ${chapterName}`;
									}
									break;
								}
							}
							break;
						}
					}
				})();

				getVerseData();

				(async () => {
					loc.verse = 'memuat';
					let vData: Array<{}>;

					vData = (await getData(`https://api.quran.com/api/v4/verses/by_page/${page}`)).verses;
					let verses: Array<{ verses: Array<{}> }> = [];
					verses.push(vData[0]['verse_key'].split(':'));
					verses.push(vData.at(-1)['verse_key'].split(':'));

					if (verses[0][0] === verses[1][0]) {
						loc.verse = `${verses[0][1]} - ${verses[1][1]}`;
					} else {
						loc.verse = `${verses[0][0]}:${verses[0][1]} - ${verses[1][0]}:${verses[1][1]}`;
					}

					let rJuzLoc = vData[0]['juz_number'];
					if (rJuzLoc > 30) {
						rJuzLoc = 30;
					} else if (rJuzLoc < 1) {
						rJuzLoc = 1;
					}
					let lJuzLoc = vData.at(-1)['juz_number'];
					if (lJuzLoc > 30) {
						lJuzLoc = 30;
					}
					loc.juz = `${rJuzLoc}`;
					if (lJuzLoc > rJuzLoc) {
						loc.juz += ` - ${lJuzLoc}`;
					}
				})();

				loc.page = `${page}`;

				break;
			case 2:
				const rPage = Number(pageProps.rPage) - 3;
				const lPage = Number(pageProps.lPage) - 3;

				(async () => {
					for (let i = 0; i < data.chapter.length; ++i) {
						let firstPage = Number(data.chapter[i].pages[1]);
						if (firstPage >= rPage) {
							loc.chapter = `${data.chapter[i]['id']}. ${data.chapter[i]['name_simple']}`;

							for (++i; i < data.chapter.length; ++i) {
								if (i === data.chapter.length - 1) {
									loc.chapter += ` - ${data.chapter[i]['id']}. ${data.chapter[i]['name_simple']}`;
									break;
								}

								firstPage = Number(data.chapter[i].pages[0]);
								if (firstPage > lPage) {
									const chapterName = `${data.chapter[i - 1]['id']}. ${
										data.chapter[i - 1]['name_simple']
									}`;
									if (chapterName !== loc.chapter) {
										loc.chapter += ` - ${chapterName}`;
									}
									break;
								}
							}
							break;
						}
					}
				})();

				getVerseData();

				(async () => {
					loc.verse = 'memuat';
					let verses: Array<Array<string>> = [];

					verses.push(
						(await getData(`https://api.quran.com/api/v4/verses/by_page/${rPage}`)).verses[0]
					);
					verses.push(
						(await getData(`https://api.quran.com/api/v4/verses/by_page/${lPage}`)).verses.at(-1)
					);

					const verses0 = verses[0]['verse_key'].split(':');
					const verses1 = verses[1]['verse_key'].split(':');
					if (verses0[0] === verses1[0]) {
						loc.verse = `${verses0[1]} - ${verses1[1]}`;
					} else {
						loc.verse = `${verses0[0]}:${verses0[1]} - ${verses1[0]}:${verses1[1]}`;
					}

					let rJuzLoc = verses[0]['juz_number'];
					if (rJuzLoc > 30) {
						rJuzLoc = 30;
					} else if (rJuzLoc < 1) {
						rJuzLoc = 1;
					}
					let lJuzLoc = verses[1]['juz_number'];
					if (lJuzLoc > 30) {
						lJuzLoc = 30;
					}
					loc.juz = `${rJuzLoc}`;
					if (lJuzLoc > rJuzLoc) {
						loc.juz += ` - ${lJuzLoc}`;
					}
				})();

				loc.page = `${rPage} - ${lPage}`;

				break;
		}
	}

	function popStateHandler() {
		let slug = location.pathname.split('/').slice(1);
		setInitPage(Number(slug) + 3);
		setIndicator();
	}

	function keydownHandler(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowLeft':
				changePage('next');
				break;
			case 'ArrowRight':
				changePage('back');
				break;
		}
	}

	function isArrowShow() {
		if (!windowProps.fsChange) {
			let contentWidth: number;
			let contentHeight: number;
			switch (windowProps.col) {
				case 1:
					contentWidth = pageProps.singleEl.scrollWidth;
					contentHeight = pageProps.singleEl.scrollHeight;
					break;
				case 2:
					contentWidth = 2 * pageProps.rightEl.scrollWidth;
					contentHeight = pageProps.rightEl.scrollHeight;
					break;
			}
			if (innerWidth - 80 <= contentWidth || innerHeight < contentHeight) {
				pageProps.arrow = false;
			} else {
				pageProps.arrow = true;
			}
		} else if (windowProps.w < 640) {
			pageProps.arrow = false;
		} else {
			pageProps.arrow = true;
		}
		windowProps.fsChange = false;
	}

	function startDrag(event: TouchEvent | MouseEvent, type: string) {
		if (!(modal.top || modal.bottom || pageProps.showNav) && innerWidth >= windowProps.initW) {
			function detect(axis: string) {
				switch (type) {
					case 'touch':
						if (axis === 'x') {
							return (event as TouchEvent).changedTouches[0].clientX;
						} else if (axis === 'y') {
							return (event as TouchEvent).changedTouches[0].clientY;
						}
					case 'mouse':
						if (axis === 'x') {
							return (event as MouseEvent).clientX;
						} else if (axis === 'y') {
							return (event as MouseEvent).clientY;
						}
				}
			}
			windowProps.initPointer = { x: detect('x'), y: detect('y') };
		}
	}

	function endDrag(event: TouchEvent | MouseEvent, type: string) {
		if (!(modal.top || modal.bottom || pageProps.showNav) && innerWidth >= windowProps.initW) {
			function detect(axis: string) {
				switch (type) {
					case 'touch':
						if (axis === 'x') {
							return (event as TouchEvent).changedTouches[0].clientX;
						} else if (axis === 'y') {
							return (event as TouchEvent).changedTouches[0].clientY;
						}
					case 'mouse':
						if (axis === 'x') {
							return (event as MouseEvent).clientX;
						} else if (axis === 'y') {
							return (event as MouseEvent).clientY;
						}
				}
			}
			const diff = {
				endX: windowProps.initPointer.x - detect('x'),
				endY: windowProps.initPointer.y - detect('y')
			};
			if (Math.abs(diff.endX) > Math.abs(diff.endY)) {
				if (diff.endX > 75) {
					changePage('back');
				} else if (diff.endX < -75) {
					changePage('next');
				}
			}
			windowProps.initPointer = { x: 0, y: 0 };
		}
	}
</script>

<svelte:window
	on:popstate={popStateHandler}
	on:keydown={keydownHandler}
	on:fullscreenchange={setScreenSize}
	on:resize={isArrowShow}
	on:touchstart={(event) => startDrag(event, 'touch')}
	on:touchend={(event) => endDrag(event, 'touch')}
	on:mousedown={(event) => startDrag(event, 'mouse')}
	on:mouseup={(event) => endDrag(event, 'mouse')}
/>
{#if mounted}
	<main class="flex flex-col items-center" style={`height: ${windowProps.h}px`}>
		{#if modal.top || modal.bottom || pageProps.showNav}
			<div
				class="fixed z-10 w-full h-full flex justify-center bg-black/10 backdrop-blur-[2px]"
				on:click={() => toggleModalState()}
			>
				<div
					class={`fixed flex flex-col items-center rounded-xl h-fit ${
						modal.top ? 'py-6 px-4 top-16 w-11/12 sm:w-2/3 lg:w-1/2' : ''
					}${modal.bottom ? 'p-3 bottom-16 bg-slate-300' : ''}`}
					class:bg-teal-400={modal.top === 'juz'}
					class:bg-cyan-400={modal.top === 'chapter'}
					class:bg-fuchsia-400={modal.top === 'verse'}
					class:bg-rose-400={modal.top === 'page'}
					on:click={(event) => event.stopPropagation()}
				>
					{#if modal.top === 'juz'}
						<ul class="flex flex-wrap gap-3 justify-center max-h-96 overflow-y-auto">
							{#each data.juz as juz}
								<li>
									<button
										class="w-10 h-10 flex items-center justify-center border rounded-lg bg-white"
										on:click={() => setJuz(juz.id)}>{juz.id}</button
									>
								</li>
							{/each}
						</ul>
					{/if}
					{#if modal.top === 'page'}
						<input
							class="rounded-lg px-2 py-1 w-11/12 sm:w-2/3 lg:w-1/2"
							placeholder="Cari halaman"
							bind:value={filter.page}
						/>
						<ul class="mt-4 flex flex-wrap gap-3 justify-center max-h-96 overflow-y-auto">
							{#each data.page.filter((p) => RegExp(filter.page, 'i').test(String(p))) as page}
								<li>
									<button
										class="w-10 h-10 flex items-center justify-center border rounded-lg bg-white"
										on:click={() => setPage(page)}>{page}</button
									>
								</li>
							{/each}
						</ul>
					{/if}
					{#if modal.top === 'verse'}
						<input
							class="rounded-lg px-2 py-1 w-11/12 sm:w-2/3 lg:w-1/2"
							placeholder="Cari ayat"
							bind:value={filter.verse}
						/>
						<div class="mt-4 flex flex-col gap-5 w-full max-h-96 overflow-y-auto">
							{#each data.verse as verses}
								{#if verses.verses.filter((p) => RegExp(filter.verse, 'i').test(String(p))).length}
									<div class="flex flex-col items-center gap-2">
										{#if data.verse.length > 1}
											<p class="font-bold text-white">
												{verses.chapter}. {data.chapter[verses.chapter - 1]['name_simple']}
											</p>
										{/if}
										<ul class="flex flex-wrap gap-3 justify-center">
											{#each verses.verses.filter( (p) => RegExp(filter.verse, 'i').test(String(p)) ) as verse}
												<li>
													<button
														class="w-10 h-10 flex items-center justify-center border rounded-lg bg-white"
														on:click={() => setVerse(verses.chapter, verse)}>{verse}</button
													>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
					{#if modal.top === 'chapter'}
						<input
							class="rounded-lg px-2 py-1 w-11/12 sm:w-2/3 lg:w-1/2"
							placeholder="Cari surat"
							bind:value={filter.chapter}
						/>
						<ul class="w-full mt-4 flex flex-wrap gap-3 justify-center max-h-96 overflow-y-auto">
							{#each data.chapter.filter((chapter) => RegExp(filter.chapter, 'i').test(chapter['name_simple']) || RegExp(filter.chapter, 'i').test(chapter['translated_name']['name']) || RegExp(filter.chapter, 'i').test(String(chapter['id']))) as chapter}
								<li class="w-11/12 sm:w-fit">
									<button
										class="w-full sm:w-72 py-1 px-3 flex items-center justify-start border rounded-lg bg-white"
										on:click={() => setChapter(chapter.id)}
									>
										<div class="flex items-center">
											<p class="w-6 mr-3">{chapter.id}</p>
											<div class="flex flex-col items-start text-left">
												<p class="font-bold">{chapter['name_simple']}</p>
												<p>{chapter['translated_name']['name']}</p>
											</div>
										</div>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					{#if modal.bottom === 'setting'}
						<ul class="flex flex-col">
							<li class="flex items-center gap-6">
								<p>Kolom tampilan</p>
								<div class="flex gap-3">
									<button
										class={`w-8 h-8 rounded ${
											windowProps.col === 1 ? 'bg-sky-300' : 'bg-white/70'
										}`}
										on:click={() => setViewColumn(1)}>1</button
									>
									<button
										class={`w-8 h-8 rounded ${
											windowProps.col === 2 ? 'bg-sky-300' : 'bg-white/70'
										}`}
										on:click={() => setViewColumn(2)}>2</button
									>
								</div>
							</li>
						</ul>
					{/if}
				</div>
			</div>
		{/if}
		<div
			class={`fixed z-10 lg:flex lg:flex-row lg:self-center lg:gap-5 lg:mt-0 ${
				pageProps.showNav ? 'mt-3 flex flex-col self-start gap-3' : 'hidden'
			}`}
			on:click={() => toggleModalState()}
		>
			<button
				class="w-fit flex gap-1 py-1 px-3 bg-teal-400 rounded-r-xl lg:rounded-tr-none lg:rounded-b-xl"
				on:click={(event) => {
					event.stopPropagation();
					pageProps.showNav = false;
					toggleModalState('juz', 'top');
				}}
			>
				<p>Juz</p>
				<p class="font-bold">{loc.juz}</p>
			</button>
			<button
				class="w-fit flex gap-1 py-1 px-3 bg-cyan-400 rounded-r-xl lg:rounded-tr-none lg:rounded-b-xl"
				on:click={(event) => {
					event.stopPropagation();
					pageProps.showNav = false;
					toggleModalState('chapter', 'top');
				}}
			>
				<p>Surat</p>
				<p class="font-bold">{loc.chapter}</p>
			</button>
			<button
				class="w-fit flex gap-1 py-1 px-3 bg-fuchsia-400 rounded-r-xl lg:rounded-tr-none lg:rounded-b-xl"
				on:click={(event) => {
					event.stopPropagation();
					pageProps.showNav = false;
					toggleModalState('verse', 'top');
				}}
			>
				<p>Ayat</p>
				<p class="font-bold">{loc.verse}</p>
			</button>
			<button
				class="w-fit flex gap-1 py-1 px-3 bg-rose-400 rounded-r-xl lg:rounded-tr-none lg:rounded-b-xl"
				on:click={(event) => {
					event.stopPropagation();
					pageProps.showNav = false;
					toggleModalState('page', 'top');
				}}
			>
				<p>Halaman</p>
				<p class="font-bold">{loc.page}</p>
			</button>
		</div>
		<div class="flex justify-center items-center select-none">
			{#if windowProps.col === 1}
				{#if pageProps.arrow}
					<button
						class="material-icons self-center p-2 rounded-full bg-stone-400/60"
						class:invisible={Number(pageProps.sPage) === 607}
						on:click={() => changePage('next')}
					>
						navigate_before
					</button>
				{/if}
				<div class="w-fit" style={`height: ${windowProps.h}px`} bind:this={pageProps.singleEl}>
					<img
						class="h-full object-contain pointer-events-none"
						src={`//source.quran.hilmy.dev/books/mushafs/hafs/dpi120/page-${pageProps.sPage}.jpg`}
						alt=""
						on:load={isArrowShow}
					/>
				</div>
				{#if pageProps.arrow}
					<button
						class="material-icons self-center p-2 rounded-full bg-stone-400/60"
						class:invisible={Number(pageProps.sPage) === 4}
						on:click={() => changePage('back')}
					>
						navigate_next
					</button>
				{/if}
			{:else if windowProps.col === 2}
				<div class="flex justify-end">
					{#if pageProps.arrow}
						<button
							class="material-icons self-center p-2 rounded-full bg-stone-400/60"
							class:invisible={Number(pageProps.lPage) === 607}
							on:click={() => changePage('next')}
						>
							navigate_before
						</button>
					{/if}
					<div class="w-fit" style={`height: ${windowProps.h}px`}>
						<img
							class="h-full object-contain pointer-events-none"
							src={`//source.quran.hilmy.dev/books/mushafs/hafs/dpi120/page-${pageProps.lPage}.jpg`}
							alt=""
						/>
					</div>
				</div>
				<div class="flex">
					<div class="w-fit" style={`height: ${windowProps.h}px`} bind:this={pageProps.rightEl}>
						<img
							class="h-full object-contain pointer-events-none"
							src={`//source.quran.hilmy.dev/books/mushafs/hafs/dpi120/page-${pageProps.rPage}.jpg`}
							alt=""
							on:load={isArrowShow}
						/>
					</div>
					{#if pageProps.arrow}
						<button
							class="material-icons self-center p-2 rounded-full bg-stone-400/60"
							class:invisible={Number(pageProps.rPage) === 4}
							on:click={() => changePage('back')}
						>
							navigate_next
						</button>
					{/if}
				</div>
			{/if}
		</div>
		<div class="fixed z-10 bottom-0 flex gap-3" on:click={() => toggleModalState()}>
			{#if !pageProps.arrow}
				<button
					class="mr-3 material-icons p-2 rounded-full bg-lime-300"
					class:invisible={windowProps.col === 1
						? Number(pageProps.sPage) === 607
						: Number(pageProps.lPage) === 607}
					on:click={() => changePage('next')}
				>
					navigate_before
				</button>
			{/if}
			<button
				class="lg:hidden material-icons p-2 rounded-t-full bg-slate-300"
				on:click={(event) => {
					event.stopPropagation();
					if (!pageProps.showNav) {
						toggleModalState();
						pageProps.showNav = true;
					} else {
						toggleModalState();
					}
				}}
			>
				menu
			</button>
			<button
				class="material-icons p-2 rounded-t-full bg-slate-300"
				on:click={(event) => {
					event.stopPropagation();
					if (!document.fullscreenElement) {
						windowProps.fsChange = true;
						document.documentElement.requestFullscreen();
					} else if (document.exitFullscreen) {
						windowProps.fsChange = true;
						document.exitFullscreen();
					}
				}}
			>
				{#if windowProps.fs}
					fullscreen_exit
				{:else}
					fullscreen
				{/if}
			</button>
			<button
				class="material-icons p-2 rounded-t-full bg-slate-300"
				on:click={(event) => {
					event.stopPropagation();
					toggleModalState('setting', 'bottom');
				}}
			>
				settings
			</button>
			<!-- <button
				class="p-2 rounded-t-full bg-slate-300"
				on:click={(event) => {
					event.stopPropagation();
					setViewColumn(windowProps.col === 1 ? 2 : 1);
				}}
			>
				{#if windowProps.col === 1}
					<p class="w-6 h-6">2</p>
				{:else if windowProps.col === 2}
					<p class="w-6 h-6">1</p>
				{/if}
			</button> -->
			{#if !pageProps.arrow}
				<button
					class="ml-3 material-icons p-2 rounded-full bg-lime-300"
					class:invisible={windowProps.col === 1
						? Number(pageProps.sPage) === 4
						: Number(pageProps.rPage) === 4}
					on:click={() => changePage('back')}
				>
					navigate_next
				</button>
			{/if}
		</div>
	</main>
{/if}
