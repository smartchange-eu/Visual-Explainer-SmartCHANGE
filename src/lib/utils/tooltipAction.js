/** @type {import('svelte/action').Action<Element, {text: string|undefined, anchor: string}>}  */
export const tooltip = (node, params) => {
	node.classList.add('tooltip');
	node.setAttribute('tabindex', '0');
	let text = params.text;
	let anchor = params.anchor || 'left';
	if (text === undefined || node === undefined) {
		return { update: () => {}, destroy: () => {} };
	}

	/** @param {any} event */
	function handleFocus(event) {
		const child = document.createElement('div');
		child.innerHTML = text;
		child.setAttribute('id', 'tooltip');
		child.setAttribute('role', 'tooltip');
		child.classList.add('absolute');
		child.classList.add('bg-gray-800');
		child.classList.add('text-white');
		child.classList.add('p-1');
		child.classList.add('rounded');
		child.classList.add('text-sm');
		child.classList.add('z-50');
		child.classList.add('pointer-events-none');
		child.style.top = `${event.y}px`;
		if (anchor === 'left') child.style.left = `${event.x + 20}px`;
		else {
			child.style.right = `${window.innerWidth - event.x + 20}px`;
		}

		node.addEventListener('mouseleave', handleBlur);
		node.addEventListener('blur', handleBlur);
		node.removeEventListener('mouseenter', handleFocus);
		node.removeEventListener('focus', handleFocus);
		document.body.appendChild(child);
	}

	function handleBlur() {
		const tooltip = document.body.querySelector('#tooltip');
		if (tooltip) document.body.removeChild(tooltip);

		node.removeEventListener('mouseleave', handleBlur);
		node.removeEventListener('blur', handleBlur);
		node.addEventListener('mouseenter', handleFocus);
		node.addEventListener('focus', handleFocus);
	}

	node.addEventListener('mouseenter', handleFocus);
	node.addEventListener('focus', handleFocus);

	return {
		update(params) {
			text = params.text;
			anchor = params.anchor || 'left';
		},
		destroy() {
			node.classList.remove('tooltip');
			const tooltipInBody = document.body.querySelector('#tooltip');
			if (tooltipInBody) document.body.removeChild(tooltipInBody);
			node.removeEventListener('mouseenter', handleFocus);
			node.removeEventListener('focus', handleFocus);
		}
	};
};
