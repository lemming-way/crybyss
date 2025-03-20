import {throttle, debounce} from 'throttle-debounce';
import {TypedEventTarget} from 'typescript-event-target';
import {CruiseAPI, Cruise, Ship, Company} from '../../state/cruise';
import {DOMComponent} from '../dom';
import {VisibilityControl} from '../map';
import CruiseMap from '../cruise-map';
import './index.css';

export default class MapOverlay extends DOMComponent {

	declare bounds: [number, number, number, number];

	events: TypedEventTarget<{
		resize: Event
	}> = new TypedEventTarget();

	constructor(
		domNode: Element,
		cruiseMap: CruiseMap,
		api: CruiseAPI,
	) {
		super(domNode);
		for (const [className, layer] of [
			['map-overlay--ship', cruiseMap.shipLayer],
			['map-overlay--anchor', cruiseMap.stopLayer],
			['map-overlay--place', cruiseMap.showplaceLayer],
		] as [string, CruiseMap['shipLayer']][])
			new LayerVisibilityButton(
				domNode.getElementsByClassName(className)[0],
				layer,
			);
		const shipSlider = new TimelineSlider(
			domNode.getElementsByClassName(
				'map-overlay--range-dates'
			)[0] as HTMLElement,
			cruiseMap,
		);
		new SearchBox(
			domNode.getElementsByClassName('map-overlay--search')[0],
			cruiseMap, api,
		);

		new DateFilter(
			document.getElementById('datepicker-input'),
			document.getElementById('time-slider'),
			document.getElementById('timeInput'),
			shipSlider,
			cruiseMap, api,
		);

		const overlayBoundsElements = [
			'map-overlay--search-box',
			'map-overlay--overlays',
			'map-overlay--range-dates',
			'map-overlay--search-results',
		].map(className => domNode.getElementsByClassName(className)[0]);
		const setOverlayBounds = () => {
			this.bounds = [
				overlayBoundsElements[0].getBoundingClientRect().bottom,
				window.innerWidth - overlayBoundsElements[1]
					.getBoundingClientRect().left,
				window.innerHeight - overlayBoundsElements[2]
					.getBoundingClientRect().top,
				overlayBoundsElements[3].getBoundingClientRect().right,
			];
			this.events.dispatchEvent(new Event('resize'));
		};
		setOverlayBounds();
		window.addEventListener('resize', setOverlayBounds);
	}

}

// Недоделано: отсутствует реакция на события CruiseMap, чекбоксы создаются костыльно,
// нет синхронизации между чекбоксами компаний и чекбоксами кораблей,
// не реализованы фолды и "выбрать все".
class SearchBox extends DOMComponent {

	declare private cruiseMap: CruiseMap;

	constructor(domNode: Element, cruiseMap: CruiseMap, api: CruiseAPI) {
		super(domNode);
		console.log('domNode', domNode)
		this.cruiseMap = cruiseMap;

		const input = domNode.getElementsByClassName(
			'map-overlay--search-box'
		)[0].querySelector('input') as HTMLInputElement;
		const resultsElement = domNode
			.getElementsByClassName('map-overlay--search-results')[0];
		const shipsElement = resultsElement
			.getElementsByClassName('map-overlay--search-ships')[0]
			.getElementsByClassName('map-overlay--search-checks')[0];
		const companiesElement = resultsElement
			.getElementsByClassName('map-overlay--search-companies')[0]
			.getElementsByClassName('map-overlay--search-checks')[0];
		const checkAllCompanies = document.getElementById('companyAllSelect') as HTMLInputElement;
		const checkAllShips = document.getElementById('shipsAllSelect') as HTMLInputElement;

		const onSelectAll = () => {
			const checkboxes = Array.from( shipsElement.getElementsByTagName('input') ).filter( el => !el.style.display );
			const allChecked = checkboxes.every(checkbox => checkbox.checked);

			for (const checkbox of checkboxes) {
					checkbox.checked = !allChecked;
					checkbox.dispatchEvent(new Event('change'));
			}
		}
		checkAllShips.addEventListener('click', onSelectAll);

		const onSelectAllCompanies = () => {
			const checkboxes = companiesElement.getElementsByTagName('input');
			const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);

			for (const checkbox of checkboxes) {
					checkbox.checked = !allChecked;
					checkbox.dispatchEvent(new Event('change'));
			}
		}
		checkAllCompanies.addEventListener('click', onSelectAllCompanies);

		const openBtns = document.querySelectorAll('.map-overlay--search-title')
		const closeCheckboxList = document.querySelectorAll('.map-overlay--search-block ')

		const checkboxOpening = ()=>{
				openBtns.forEach((openBtn , index) =>{
					openBtn.addEventListener('click',()=>{
						if(!closeCheckboxList[index].classList.contains('active')){
							closeCheckboxList[index].classList.add('active')

						}else{

							closeCheckboxList[index].classList.remove('active')
						}
					})
				})
			}
		checkboxOpening()

		let searchLock = Promise.resolve();

		const onInput = () => {
			let value = input.value;
			searchLock = searchLock.then(async () => {
				if (value !== input.value)
					return;
				await new Promise( resolve => { setTimeout( resolve, 400 ); } );   // задержка 0.4 секунды
				if (value !== input.value)
					return;

				for (const ship of this.cruiseMap.ships) {
					this.cruiseMap.removeShip( ship );
				}
				companiesElement.textContent = '';
				shipsElement.textContent = '';
				const companiesCheckboxes = [];
				const shipsCheckboxes = [];
				if (value.length < 2) value = '';   // поиск от 2 букв
				await api.setFilter({ companyName: value, shipName: value });
				for await (const company of api.allCompanies()) {
					companiesCheckboxes.push(
						...this.createCompanyElements(company),
					);
				}
				for await (const ship of api.allShips()) {
					shipsCheckboxes.push(...this.createShipElements(ship));
				}
				companiesElement.prepend(...companiesCheckboxes);
				shipsElement.prepend(...shipsCheckboxes);
			});
		};

		window.addEventListener('cruisesDataLoaded', onInput);
		input.addEventListener('input', onInput);
	}

	private createCompanyElements(company: Company): Element[] {
		const {id, name, color} = company;
		const elementId = `map-overlay--search-company_${id}`;

		const [input, label] = this.createCheckboxElements(elementId);
		input.checked = true;
		label.style.setProperty(
			'--map-overlay--search-check_color',
			`#${color.toString(16)}`
		);

		const colorElement = document.createElement('span');
		colorElement.classList.add('color');
		label.appendChild(colorElement);

		const nameElement = document.createElement('span');
		nameElement.classList.add('name');
		nameElement.innerText = name;
		label.appendChild(nameElement);

		input.addEventListener('change', async event => {
			const checked = ( event.target as HTMLInputElement ).checked as boolean;
			for await (const ship of company.ships()) {
				const {id} = ship;
				const input = document.getElementById( `map-overlay--search-ship_${id}` ) as HTMLInputElement;
				if (input) {
					if (checked && input.style.display) {
						input.checked = input.defaultChecked;
						for (const el of [ input, ...input.labels ]) {
							el.style.display = null;
						}
						if (input.checked) input.dispatchEvent( new Event( 'change' ) );
					}
					else if (!checked && !input.style.display) {
						input.defaultChecked = input.checked;
						input.checked = false;
						for (const el of [ input, ...input.labels ]) {
							el.style.display = 'none';
						}
						if (input.defaultChecked) input.dispatchEvent( new Event( 'change' ) );
					}
				}
			}
		});

		return [input, label];
	}

	private createShipElements(ship: Ship): Element[] {
		const {id, name} = ship;
		const elementId = `map-overlay--search-ship_${id}`;

		const [input, label] = this.createCheckboxElements(elementId);
		input.checked = true;

		const nameElement = document.createElement('span');
		nameElement.classList.add('name');
		nameElement.innerText = name;
		label.appendChild(nameElement);

		input.addEventListener('change', () => {
			this.handleShipCheckbox(input, ship);
		});

		input.dispatchEvent( new Event( 'change' ) );
		return [input, label];
	}

	private createCheckboxElements(id: string): [
		HTMLInputElement, HTMLLabelElement
	] {
		const input = document.createElement('input');
		input.classList.add('custom-checkbox');
		input.id = id;
		input.type = 'checkbox';

		const label = document.createElement('label');
		label.classList.add('map-overlay--search-check');
		label.htmlFor = id;

		return [input, label];
	}

	private handleShipCheckbox(checkbox: HTMLInputElement, ship: Ship) {
		if (checkbox.checked) {
			this.cruiseMap.addShip(ship);
		} else {
			this.cruiseMap.removeShip(ship);
		}
	}

}

class DateFilter {
	declare private cruiseMap: CruiseMap;

	constructor(dateInput: Element, timeSlider: Element, timeInput: Element, shipSlider: TimelineSlider, cruiseMap: CruiseMap,  api: CruiseAPI) {
		this.cruiseMap = cruiseMap;

		const date = dateInput as HTMLInputElement;
		const slider = timeSlider as HTMLInputElement;
		const time = timeInput as HTMLInputElement;

		let dateValue = '';
		let timeValue = '';

		const createDate = () => {
			if (!dateValue) return;
			let finalDate;
			
			if (timeValue) {
				const [month, day, year] = dateValue.split('/');
				const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
				const formattedTime = timeValue.includes(':') ? timeValue : `${timeValue}:00`;
				
				finalDate = new Date(`${isoDate}T${formattedTime}`);
			} else {
				const [month, day, year] = dateValue.split('/');
				finalDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
			}
			
			console.log('Создана дата:', finalDate);
			shipSlider.setSlider(finalDate, cruiseMap);
			cruiseMap.timelinePoint = finalDate;
		};

		const handleDateChange = (event: Event) => {
			const { date } = (event as CustomEvent).detail;
			console.log('Выбранная дата:', date);
			const [day, month, year] = date.split('/');
			dateValue = `${month}/${day}/${year}`;
			createDate();
		};

		const handleTimeSliderChange = debounce(400, () => {
			const tooltip = document.getElementById('time-tooltip')
			const tooltipTime = tooltip.innerText;
			if (tooltipTime.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
				timeValue = tooltipTime.includes(':') ? 
					(tooltipTime.split(':').length === 2 ? `${tooltipTime}:00` : tooltipTime) : 
					`${tooltipTime}:00:00`;
					time.value = timeValue;
					document.getElementById('timeDisplay').innerText = timeValue;
			}
			createDate();
		});

		const updateTimeSlider = (timeValue: string) => {
			console.log('timeValue', timeValue)
			const [hours, minutes] = timeValue.split(':');
			const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
			const sliderValue = Math.round(totalMinutes);
			slider.value = sliderValue.toString();

			const timeSlider = document.getElementById("time-slider");
			const timeTooltip = document.getElementById("time-tooltip");
			let sliderRect = timeSlider.getBoundingClientRect();
			let thumbWidth = 16; 
			let percent = (sliderValue / 1439); 

			let newPosition = percent * (sliderRect.width - thumbWidth) + thumbWidth / 2;
			timeTooltip.style.left = `${newPosition}px`;
			timeTooltip.textContent = timeValue;
		};

		const handleTimeInputChange = () => {
			timeValue = time.value.split(':').slice(0,2).join(':');
			updateTimeSlider(timeValue);
			createDate();
		};

		window.addEventListener('datepicker-change', handleDateChange);
		slider.addEventListener('input', handleTimeSliderChange);
		time.addEventListener('input', handleTimeInputChange);
	}
}

class LayerVisibilityButton extends DOMComponent {

	constructor(domNode: Element, layer: VisibilityControl) {
		super(domNode);
		const onVisibilityChange = () => {
			if (layer.visible)
				domNode.classList.add('active');
			else
				domNode.classList.remove('active');
		};
		onVisibilityChange();
		layer.events.addEventListener('visibilitychange', onVisibilityChange);
		domNode.addEventListener('click', () => {
			layer.toggle();
		});
	}

}

class TimelineSlider extends DOMComponent {

	constructor(domNode: HTMLElement, cruiseMap: CruiseMap) {
		super(domNode);
		const slider = domNode.getElementsByClassName('rs-container')[0];
		const fromElement = domNode
			.getElementsByClassName('range--deco-left')[0] as HTMLElement;
		const toElement = domNode
			.getElementsByClassName('range--deco-right')[0] as HTMLElement;
		const valueElement = slider
			.getElementsByClassName('rs-tooltip')[0] as HTMLElement;

		const onTimeRangeChanged = () => {
			if (!!+cruiseMap.timelineRange[0] && !!+cruiseMap.timelineRange[1]) {
				for (const [value, element] of [
					[cruiseMap.timelineRange[0], fromElement],
					[cruiseMap.timelineRange[1], toElement],
				] as [Date, HTMLElement][])
					element.innerText = TimelineSlider.formatDate(value);
				domNode.classList.remove('map-overlay--range-dates-hidden');
			} else
				domNode.classList.add('map-overlay--range-dates-hidden');
		};
		onTimeRangeChanged();
		cruiseMap.events.addEventListener('timerangechanged', onTimeRangeChanged);
		const onTimelineMove = () => {
			const [from, to] = cruiseMap.timelineRange;
			if (+from !== 0 || +to !== 0)
				domNode.style.setProperty(
					'--map-overlay--range-dates_point',
					`${(+cruiseMap.timelinePoint - +from) / (+to - +from)}`,
				);
			valueElement.innerText =
				TimelineSlider.formatDate(cruiseMap.timelinePoint);
			window.dispatchEvent(new CustomEvent('timelinemove', {detail: {date: cruiseMap.timelinePoint}}));
		};
		onTimelineMove();
		cruiseMap.events.addEventListener('timelinemove', onTimelineMove);

		let sliderPressed = false;
		slider.addEventListener('pointerdown', () => {
			sliderPressed = true;
		});
		document.addEventListener('pointerup', () => {
			sliderPressed = false;
		});
		const moveTimeline = throttle(100, point => {
			const [from, to] = cruiseMap.timelineRange;
			cruiseMap.timelinePoint = new Date(+from + point * (+to - +from));
		});
		document.addEventListener('pointermove', ({
			clientX
		}) => window.requestAnimationFrame(() => {
			if (sliderPressed) {
				const {x, width} = slider.getBoundingClientRect();
				const point = Math.min(Math.max((clientX - x) / width, 0), 1);
				domNode.style.setProperty(
					'--map-overlay--range-dates_point',
					`${point}`
				);
				moveTimeline(point);
			}
		}));
	}

	public setSlider(value: Date, cruiseMap: CruiseMap) {
		const [from, to] = cruiseMap.timelineRange;
		const timeRange = +to - +from;
		const timePoint = +value - +from;
		let point = timePoint / timeRange;
		if (point < 0) {
			point = 0;
		} else if (point > 1) {
			point = 1;
		}
		const element = this.domNode as HTMLElement;
		element.style.setProperty(
			'--map-overlay--range-dates_point',
			`${point}`
		);
		cruiseMap.timelinePoint = value;
		const slider = element.getElementsByClassName('rs-container')[0];
		const valueElement = slider
			.getElementsByClassName('rs-tooltip')[0] as HTMLElement;
		valueElement.innerText = TimelineSlider.formatDate(value);
	}

	private static formatDate(value: Date): string {
		return value.toLocaleDateString(undefined, {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	}

}
