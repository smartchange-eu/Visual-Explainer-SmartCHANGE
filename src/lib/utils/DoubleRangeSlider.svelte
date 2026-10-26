<script lang="ts">
	import { clamp } from 'lodash-es';
	import Tooltip from './Tooltip.svelte';

	export let start = 0;
	export let end = 1;
	export let onChange = (start: number, end: number) => {};
	let leftHandle: HTMLElement;
	let body: HTMLElement;
	let slider: HTMLElement;
	export let xScale: (x: number) => number;

	function draggable(node: HTMLElement) {
		let x: number;
		let y: number;
		function handleMousedown(event: MouseEvent) {
			if (event.type === 'touchstart') {
				event = (event as any).touches[0];
			}
			event = event as MouseEvent;

			x = event.clientX;
			y = event.clientY;
			node.dispatchEvent(
				new CustomEvent('dragstart', {
					detail: { x, y }
				})
			);
			window.addEventListener('mousemove', handleMousemove);
			window.addEventListener('mouseup', handleMouseup);
			window.addEventListener('touchmove', handleMousemove as any);
			window.addEventListener('touchend', handleMouseup as any);
		}
		function handleMousemove(event: MouseEvent) {
			if (event.type === 'touchmove') {
				event = (event as any).changedTouches[0];
			}
			const dx = event.clientX - x;
			const dy = event.clientY - y;
			x = event.clientX;
			y = event.clientY;
			node.dispatchEvent(
				new CustomEvent('dragmove', {
					detail: { x, y, dx, dy }
				})
			);
		}
		function handleMouseup(event: MouseEvent) {
			x = event.clientX;
			y = event.clientY;
			node.dispatchEvent(
				new CustomEvent('dragend', {
					detail: { x, y }
				})
			);
			window.removeEventListener('mousemove', handleMousemove);
			window.removeEventListener('mouseup', handleMouseup);
			window.removeEventListener('touchmove', handleMousemove as any);
			window.removeEventListener('touchend', handleMouseup as any);

			onChange(start, end);
		}
		node.addEventListener('mousedown', handleMousedown);
		node.addEventListener('touchstart', handleMousedown as any);
		return {
			destroy() {
				node.removeEventListener('mousedown', handleMousedown);
				node.removeEventListener('touchstart', handleMousedown as any);
			}
		};
	}
	function setHandlePosition(which: 'start' | 'end') {
		return function (event: any) {
			const { left, right } = slider.getBoundingClientRect();
			const parentWidth = right - left;
			const p = Math.min(Math.max((event.detail.x - left) / parentWidth, 0), 1);
			if (which === 'start') {
				start = p;
				end = Math.max(end, p);
			} else {
				start = Math.min(p, start);
				end = p;
			}
		};
	}
	function setHandlesFromBody(event: any) {
		const { width } = body.getBoundingClientRect();
		const { left, right } = slider.getBoundingClientRect();
		const parentWidth = right - left;
		const leftHandleLeft = leftHandle.getBoundingClientRect().left;
		const pxStart = clamp(leftHandleLeft + event.detail.dx - left, 0, parentWidth - width);
		const pxEnd = clamp(pxStart + width, width, parentWidth);
		const pStart = pxStart / parentWidth;
		const pEnd = pxEnd / parentWidth;
		start = pStart;
		end = pEnd;
	}
</script>

<div class="double-range-container my-2">
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="slider" bind:this={slider}>
		<div
			class="body"
			bind:this={body}
			use:draggable
			on:dragmove|preventDefault|stopPropagation={setHandlesFromBody}
			style="
				left: {100 * start}%;
				right: {100 * (1 - end)}%;
			"
		></div>
		<Tooltip text={`${xScale(start).toFixed(2)}`}>
			<div
				class="handle"
				bind:this={leftHandle}
				data-which="start"
				use:draggable
				on:dragmove|preventDefault|stopPropagation={setHandlePosition('start')}
				on:dblclick={() => {
					start = 0;
					onChange(start, end);
				}}
				style="
				left: {100 * start}%
			"
			></div>
		</Tooltip>
		<Tooltip text={`${xScale(end).toFixed(2)}`}>
			<div
				class="handle"
				data-which="end"
				use:draggable
				on:dragmove|preventDefault|stopPropagation={setHandlePosition('end')}
				on:dblclick={() => {
					end = 1;
					onChange(start, end);
				}}
				style="
				left: {100 * end}%
			"
			></div>
		</Tooltip>
	</div>
</div>

<style>
	.double-range-container {
		width: 100%;
		height: 20px;
		user-select: none;
		box-sizing: border-box;
		white-space: nowrap;
	}
	.slider {
		position: relative;
		width: 100%;
		height: 6px;
		top: 50%;
		transform: translate(0, -50%);
		background-color: #e2e2e2;
		box-shadow:
			inset 0 7px 10px -5px #4a4a4a,
			inset 0 -1px 0px 0px #9c9c9c;
		border-radius: 1px;
	}
	.handle {
		position: absolute;
		top: 50%;
		width: 0;
		height: 0;
	}
	.handle:after {
		content: ' ';
		box-sizing: border-box;
		position: absolute;
		border-radius: 50%;
		width: 16px;
		height: 16px;
		background-color: #fdfdfd;
		border: 1px solid #7b7b7b;
		transform: translate(-50%, -50%);
	}
	/* .handle[data-which="end"]:after{
		transform: translate(-100%, -50%);
	} */
	.handle:active:after {
		background-color: #ddd;
		z-index: 9;
	}
	.body {
		top: 0;
		position: absolute;
		background-color: #303030;
		bottom: 0;
	}
</style>
