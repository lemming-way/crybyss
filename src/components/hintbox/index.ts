/**
 * @file Маркер с вопросительным знаком для всплывающей подсказки.
 * @module components/hintbox
 * @version 1.0.0
 */

import { DOMComponent } from "../dom";
import './index.css';

/**
 * При нажатии на кнопку переключается класс "active".
 */
class ToggleButton extends DOMComponent {
	/** @param {Element} domNode - DOM элемент кнопки */
	constructor(domNode: Element) {
		super(domNode);
		domNode.addEventListener("click", event => {
			if (!domNode.classList.contains('active')) {
				setTimeout( () => domNode.classList.add("active"), 0 );
			}
		});
		document.addEventListener("click", event => {
			if (domNode.classList.contains('active') && !( event.target as HTMLElement ).closest('.hint-box')) {
				domNode.classList.remove("active");
			}
		});
	}
}

for (const button of document.getElementsByClassName( "hint-toggle")) {
	new ToggleButton(button);
}
