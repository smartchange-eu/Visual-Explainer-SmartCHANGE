<script lang="ts">
	import { computePosition, flip } from '@floating-ui/dom';

	export let text: string;
	export let component = 'div';
	export let wrapperStyle: string = '';

	let ref: Element | null = null;
	let tooltipRef: HTMLElement | null = null;
	let show = false;
	export let className: string = '';
	export let placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

	$: if (ref && tooltipRef) {
		computePosition(ref, tooltipRef, {
			placement: placement,
			// Try removing this line below. The tooltip will
			// overflow the viewport's edge!
			middleware: [flip()]
		}).then(({ x, y }) => {
			if (tooltipRef === null) throw new Error('Tooltip ref is null');
			Object.assign(tooltipRef.style, {
				top: `${y}px`,
				left: `${x}px`
			});
		});
	}
</script>

{#if show}
	<div id="floating" class="pointer-events-none z-10 max-w-40" bind:this={tooltipRef}>{text}</div>
{/if}
<svelte:element
	this={component}
	bind:this={ref}
	id="reference"
	on:mouseenter={() => (show = true)}
	on:mouseleave={() => (show = false)}
	role="button"
	tabindex="0"
	class={className}
	style={wrapperStyle}
>
	<slot />
</svelte:element>

<style>
	#floating {
		position: absolute;
		background: white;
		padding: 10px;
		border-radius: 4px;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);

		width: max-content;
		position: absolute;
		top: 0;
		left: 0;
		background: #222;
		color: white;
		font-weight: bold;
		padding: 5px;
		border-radius: 4px;
		font-size: 90%;
	}
</style>
