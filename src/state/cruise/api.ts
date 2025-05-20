/**
 * @file Модуль получения и кэширования данных о круизах по API.
 * @module state/api
 * @version 1.0.0
 */

import {
	CruiseAPI,
	Cruise, Company, Ship, Location, TrackLocation, LocationType,
	CruiseRoute, TrackPoint, defaultCompanyColor
} from '.';

/// @todo: Конфиг вынести в отдельный файл
/** URL сайта */
const siteURL = 'https://krubiss.ru';
/** URL API */
const apiURL = 'https://krubiss.ru/api/map';
/** Интерфейсы API */
const apiEntries = {
	start : 'start',
	startCruise : 'start/cruise',
	startStops : 'start/stops',
	startSights : 'start/sights',
	stops : 'stops',
	cruiseSights : 'sights/byCruiseId',
	sightsByIds : 'sights/byIds',
	gateways : 'gateways',
	points : 'points'
};

/** Корпоративные цвета круизных компаний */
const brandColors: Record<string, number> = {
	'АЗУРИТ': 0x31739D,
	'Мостурфлот': 0xF8130D
};
/** Цвета для прочих компаний, не имеющих корпоративного цвета */
const otherColors = [
	0xE137C2,
	0x8CE4CB,
	0xFFC4A4,
	0xFEBC43,
	0xB9D252,
	0x9F9CB9,
	0x8CB7B5,
	0xF5AAB4,
	0xFFFF00,
	0x76AA74,
	0x715E7C,
	0xFFA79B,
	0x59637F,
	0xEE5C48,
	0x25E6E3,
	0xDCF4E6,
	0xDEF5AF,
	0xC84457,
	0x936A60
];

let usedColors = 0;

/**
 * Сортированный список. При добавлении и удалении элементов сохраняется порядок сортировки.
 * Кроме того, в список не могут быть помещены два элемента с одинаковым ID.
 */
class SortedList<T extends { id: string }> implements Iterable<T> {
	declare compareFunc: ( a: T, b: T ) => number;
	declare sortingOrder: Record<string, number>;
	declare items: T[];

	/**
	 * @param compareFunc - функция для сортировки элементов.
	 * @param {Array<{id: string}>} [items=[]] - начальный список элементов.
	 */
	constructor( compareFunc: ( a: T, b: T ) => number, items: T[] = [] ) {
		this.compareFunc = compareFunc;
		this.items = [ ...items.filter( item => !!item.id ) ];
		if (this.items.length > 0) {
			this.items.sort( compareFunc );
			this.sortingOrder = this.items.reduce( (ret, item, index) => { ret[ item.id ] = index; return ret; }, {} as Record<string, number> );
		}
		else {
			this.sortingOrder = {};
		}
	}

	/** Количество элементов в списке */
	get count() { return this.items.length; }

	/**
	 * Получить элемент по ID.
	 * @param {string} id - ID элемента.
	 * @returns Элемент с указанным ID или undefined.
	 */
	item( id: string ): T | undefined {
		return this.items[ this.sortingOrder[ id ] ];
	}

	/**
	 * Добавить элемент к списку.
	 * @param item - Добавляемый элемент.
	 * @returns {number} Новое количество элементов в списке.
	 */
	add( item: T ): number {
		if (!item?.id) return this.items.length;
		if (this.sortingOrder[ item.id ]) {
			if (!this.compareFunc( this.items[ this.sortingOrder[ item.id ] ], item )) {
				this.items[ this.sortingOrder[ item.id ] ] = item;
				return this.items.length;
			}
			this.delete( item.id );
		}

		let left = 0;
		let right = this.items.length - 1;
		while (right >= left) {
			const mid = right + left >> 1;
			const cmp = this.compareFunc( this.items[ mid ], item );
			if (!cmp) {
				left = mid + 1;
				while (left < this.items.length && !this.compareFunc( this.items[ left ], item )) left++;
				break;
			}
			if (cmp < 0) left = mid + 1;
			else right = mid - 1;
		}
		this.items.splice( left, 0, item );
		for (const id of Object.keys( this.sortingOrder )) {
			if (this.sortingOrder[ id ] >= left) {
				this.sortingOrder[ id ]++;
			}
		}
		this.sortingOrder[ item.id ] = left;

		return this.items.length;
	}

	/**
	 * Удалить элемент из списка.
	 * @param {string} id - ID элемента.
	 * @returns Удалённый элемент или undefined, если элемент не найден.
	 */
	delete( id: string ): T | undefined {
		let ret = this.item( id );
		if (!!ret) {
			const index = this.sortingOrder[ id ];
			this.items.splice( index, 1 );
			for (const id of Object.keys( this.sortingOrder )) {
				if (this.sortingOrder[ id ] > index) {
					this.sortingOrder[ id ]--;
				}
			}
			delete this.sortingOrder[ id ];
		}
		return ret;
	}

	/**
	 * Получить элемент по порядковому номеру.
	 * @param {number} index - номер элемента в списке.
	 * @returns Элемент списка или undefined, если номер неправильный.
	 */
	at( index: number ): T | undefined { return this.items[ index ]; }
	/**
	 * Получить массив отфильтрованных элементов, аналогично фунции Array.filter.
	 * @param callbackFn - Функция фильтра.
	 * @param thisArg - Параметр this при вызове функции.
	 * @returns {Array} Отфильтрованный список элементов.
	 */
	filter( callbackFn: ( element: T, index?: number, array?: T[] ) => boolean, thisArg?: any ): T[] { return this.items.filter( callbackFn, thisArg ); }
	/**
	 * Преобразование списка, аналогично фунции Array.map.
	 * @param callbackFn - Функция преобразования.
	 * @param thisArg - Параметр this при вызове функции.
	 * @returns {Array} Преобразованный список.
	 */
	map( callbackFn: ( element: T, index?: number, array?: T[] ) => any, thisArg?: any ): any[] { return this.items.map( callbackFn, thisArg ); }
	/** Итератор списка */
	[Symbol.iterator](): Iterator<T> { return this.items[Symbol.iterator](); }
};

/**
 * Объект данных круизной компании
 * @property {string} id - ID компании
 * @property {string} name - наименование компании
 * @property {number} color - назначенный цвет маркеров
 */
class CompanyData implements Company {
	declare id: string;
	declare name: string;
	declare color: number;

	/** @param {Object} data - Данные, полученные с сервера */
	constructor( data: any ) {
		Object.assign( this, {
			...data,
			color:
				brandColors[ data.name ] ??
				otherColors[ usedColors++ ] ??
				defaultCompanyColor
		} );
	}

	/**
	 * Получить все круизы компании.
	 * @yields {Cruise}
	 */
	*cruises(): Iterable<Cruise> {
		for (const index of cache.activeCruises) {
			const cruise = cache.cruises.at( index );
			const ship = cruise.ship;
			if (ship?.company === this) yield cruise;
		}
	}

	/**
	 * Получить теплоходы компании.
	 * @yields {Ship}
	 */
	*ships(): Iterable<Ship> {
		const shipIds: Record<string, true> = {};
		for (const index of cache.activeCruises) {
			const cruise = cache.cruises.at( index );
			const ship = cruise.ship;
			if (ship?.company === this) shipIds[ ship.id ] = true;
		}
		yield* cache.ships.filter( ship => shipIds[ ship.id ] );
	}
}

/**
 * Объект данных круиза.
 * @property {string} id - ID круиза.
 * @property {string} name - Название круиза.
 * @property {Date} departure - Дата отправления.
 * @property {Date} arrival - Дата прибытия.
 * @property {string} departureLocationName - Стоянка отправления.
 * @property {string} arrivalLocationName - Стоянка прибытия.
 * @property {string} url - Ссылка на круиз.
 * @property {Ship} ship - Объект данных теплохода.
 * @property {Company} company - Объект данных компании.
 * @property {number} routeReadyStage - Стадия загрузки трека круиза.
 * @property {Promise<TrackLocation[]>} stops - Промис, возвращающий список стоянок на круизе.
 * @property {Promise<void>} [_trackLoader] - Промис, сигнализирующий о завершении этапа загрузки трека.
 * @property {boolean} [_isFetching] - В процессе загрузки трека.
 * @property {boolean} [_loadHighPriority] - Высокий приоритет загрузки.
 */
class CruiseData implements Cruise {
	declare id: string;
	declare name: string;
	declare departure: Date;
	declare arrival: Date;
	declare departureLocationName: string;
	declare arrivalLocationName: string;
	declare url: string;
	declare ship: Ship;
	declare company: Company;
	declare routeReadyStage: number;
	declare stops: Promise<TrackLocation[]>;
	declare _sights: Promise<TrackLocation[]>;
	declare _gateways: Promise<TrackLocation[]>;
	declare _sunrises: TrackPoint[];
	declare _sunsets: TrackPoint[];
	declare _route: Promise<CruiseRoute>;

	declare _trackLoader?: Promise<void>;
	declare _isFetching?: boolean;
	declare _loadHighPriority?: boolean;

	/** @param {Object} data - Данные, полученные с сервера */
	constructor( data: any ) {
if (process.env.NODE_ENV === 'production') {
		Object.assign( this, {
			id: data.id,
			name: data.name,
			departure: parseDate( data.departure ),
			arrival: parseDate( data.arrival ),
			departureLocationName: data.departureLocationName,
			arrivalLocationName: data.arrivalLocationName,
			url: data.url,
			ship: cache.ship( data.shipId ),
			company: cache.ship( data.shipId )?.company,
			routeReadyStage: 0
		} );
}
else {
		Object.assign( this, {
			id: data.id,
			name: data.name,
			departure: parseDate( data.departure ),
			arrival: parseDate( data.arrival ),
			departureLocationName: data.departureLocationName,
			arrivalLocationName: data.arrivalLocationName,
			url: data.url ? ( /^https?:\/\//.test( data.url ) ? '' : siteURL ) + data.url : '',
			ship: cache.ship( data.shipId ),
			company: cache.ship( data.shipId )?.company,
			routeReadyStage: 0
		} );
}

		if (!!cache.stops) {
			const stops = data.stops.map( ( stop: any ) => ({
				arrival: parseDate( stop.arrival ),
				departure: parseDate( stop.departure ),
				location: cache.stops[ stop.id ] ?? {}
			}) );
			this.stops = Promise.resolve( stops );
		}
		else {
			this.stops = new Promise( resolve => {
				const initStops = () => {
					const stops = data.stops.map( ( stop: any ) => ({
						arrival: parseDate( stop.arrival ),
						departure: parseDate( stop.departure ),
						location: cache.stops[ stop.id ] ?? {}
					}) );
					resolve( stops );
				};
				window.addEventListener( 'trackstops-loaded', initStops, { once: true } );
			} );
		}

		if (!!data.sights) {
			const sights = data.sights.map( ( item: any ) => ({
				arrival: parseDate( item.arrival ),
				side: item.side.toLowerCase(),
				location: ( cache.sights[ item.id ] ?? {} ) as Location
			}) );
			this._sights = Promise.resolve( sights );
		}

		if (!!data.points) {
			const points = this._parseRoute( data.points );
			this._route = Promise.resolve( new CruiseRoute( points ) );
			this.routeReadyStage = 4;
		}
	}

	/**
	 * Промис, возвращаюший список достопримечательностей на маршруте.
	 * Начинает загрузку, если она ещё не начата.
	 * @type {Promise<TrackLocation[]>}
	 */
	get sights() {
		if (!this._sights) this._sights = new Promise( async resolve => {
			const data = await fetchCruiseSights( this.id );
			const ids = data.reduce( ( ret: Record<string, true>, item: any ) => {
				if (!cache.sights[ item.id ] || cache.sights[ item.id ] instanceof Promise) ret[ item.id ] = true;
				return ret;
			}, {} );
			if (Object.keys( ids ).length > 0) {
				await fetchSights( Object.keys( ids ) );
			}
			const sights = data.map( ( item: any ) => ({
				arrival: parseDate( item.arrival ),
				side: item.side.toLowerCase(),
				location: ( cache.sights[ item.id ] ?? {} ) as Location
			}) );
			resolve( sights );
		} );
		return this._sights;
	}

	/**
	 * Промис, возвращаюший список шлюзов на маршруте.
	 * Срабатывает после первого этапа загрузки трека.
	 * @type {Promise<TrackLocation[]>}
	 */
	get gateways() {
		if (this._gateways) return this._gateways;
		return this.route.then( () => this._gateways );
	}

	/**
	 * Промис, возвращаюший список восходов на маршруте.
	 * Срабатывает после первого этапа загрузки трека.
	 * @type {Promise<TrackPoint[]>}
	 */
	get sunrises() {
		if (this._sunrises) return Promise.resolve( this._sunrises );
		return this.route.then( () => this._sunrises );
	}

	/**
	 * Промис, возвращаюший список закатов на маршруте.
	 * Срабатывает после первого этапа загрузки трека.
	 * @type {Promise<TrackPoint[]>}
	 */
	get sunsets() {
		if (this._sunsets) return Promise.resolve( this._sunsets );
		return this.route.then( () => this._sunsets );
	}

	/**
	 * Разобрать данные точек маршрута.
	 * @param {Object} data - Данные, полученные с сервера.
	 */
	_parseRoute( data: any ) {
		this._sunrises = [];
		this._sunsets = [];
		const gateways: any[] = [];
		const points = data.map( ( item: any ) => {
			const ret: TrackPoint = {
				lat: item.lat,
				lng: item.lng,
				arrival: parseDate( item.arrival ),
				angle: item.angle,
				isStop: !!item.isStop
			};
			if (item.sunrise) {
				ret.side = item.side ?? '';
				this._sunrises.push( ret );
			}
			if (item.sunset) {
				ret.side = item.side ?? '';
				this._sunsets.push( ret );
			}
			if (!!item.gateway) {
				gateways.push({
					arrival: ret.arrival,
					gateway: item.gateway
				});
			}
			return ret;
		} );
		if (!!cache.gateways) {
			this._gateways = Promise.resolve(
				gateways.map( ( item: any ) => ({
					arrival: item.arrival,
					location: ( cache.gateways[ item.gateway ] ?? {} ) as Location
				}) )
			);
		}
		else {
			this._gateways = new Promise( resolve => {
				const initGateways = () => {
					resolve(
						gateways.map( ( item: any ) => ({
							arrival: item.arrival,
							location: ( cache.gateways[ item.gateway ] ?? {} ) as Location
						}) )
					);
				};
				window.addEventListener( 'gateways-loaded', initGateways, { once: true } );
			} );
		}
		return points;
	}

	/**
	 * Промис, возвращающий трек маршрута.
	 * Начинает загрузку, если она ещё не начата.
	 * @type {Promise<CruiseRoute>}
	 */
	get route() {
		if (!this._route) this._route = new Promise( async resolve => {
			const data = await fetchCruiseTracks( this.id );
			const points = this._parseRoute( data );
			resolve( new CruiseRoute( points ) );
			this.routeReadyStage = 1;
		} );
		return this._route;
	}

	/**
	 * Поэтапная загрузка маршрута.
	 * @returns {Promise} Пустой промис, сигнализирующий о завершении этапа загрузки.
	 */
	loadTrackProgressive( highPriority: boolean = false ) {
		if (this.routeReadyStage > 0 && this.routeReadyStage < 4) {
			let promise = this._trackLoader;
			if (promise) {
				if (!this._isFetching && this._loadHighPriority !== highPriority) {
					this._loadHighPriority = highPriority;
					queueFetchTrackProgressive( this.id, this.routeReadyStage + 1, highPriority );
				}
			}
			else {
				let route: CruiseRoute;
				promise = this._route
					.then( result => {
						route = result;
						this._loadHighPriority = highPriority;
						return queueFetchTrackProgressive( this.id, this.routeReadyStage + 1, highPriority );
					} )
					.then( fetching => {
						this._isFetching = true;
						return fetching;
					} )
					.then( data => {
						let index = 0;
						for (const item of data) {
							const point: TrackPoint = {
								lat: item.lat,
								lng: item.lng,
								arrival: parseDate( item.arrival ),
								isStop: false,
								angle: item.angle
							};
							while (index < route.points.length && +route.points[ index ].arrival <= +point.arrival) index++;
							route.points.splice( index, 0, point );
						}
						this.routeReadyStage++;
						this._trackLoader = undefined;
						this._isFetching = false;
					} );
				this._trackLoader = promise;
			}

			return promise;
		}

		return Promise.resolve();
	}

	/**
	 * Установить приоритет загрузки трека.
	 * @param {boolean} highPriority - Высокий приоритет загрузки.
	 * @returns {void}
	 */
	setHighPriorityLoading( highPriority: boolean ) {
		if (this._trackLoader && !this._isFetching && this._loadHighPriority !== highPriority) {
			this._loadHighPriority = highPriority;
			queueFetchTrackProgressive( this.id, this.routeReadyStage + 1, highPriority );
		}
	}

	/**
	 * Прервать загрузку трека. Если загрузка уже идёт, текущий этап загрузки всё равно завершится,
	 * но следующий не будет начат.
	 * @returns {void}
	 */
	cancelLoadTrack() {
		if (!!this._trackLoader && !this._isFetching) {
			cancelFetchTrack( this.id );
			this._trackLoader = undefined;
		}
	}
}

/**
 * Объект данных теплохода.
 * @property {string} id - ID теплохода.
 * @property {string} name - Название теплохода.
 * @property {Company} company - Объект данных круизной компании.
 */
class ShipData implements Ship {
	declare id: string;
	declare name: string;
	declare company: Company;

	/** @param {Object} data - Данные, полученные с сервера */
	constructor( data: any ) {
		Object.assign( this, {
			id: data.id,
			name: data.name,
			company: cache.company( data.companyId )
		} );
	}

	/**
	 * Дата начала первого круиза теплохода. Всегда сдвигается на начало суток, независимо от
	 * времени отправления.
	 * @type {Date}
	 */
	get navigationStartDate(): Date | undefined {
		const cruise = this.cruises()[Symbol.iterator]().next().value;
		if (!cruise?.departure) return;
		else {
			const navigationStartDate =  new Date( +cruise.departure );
			navigationStartDate.setMilliseconds(0);
			navigationStartDate.setSeconds(0);
			navigationStartDate.setMinutes(0);
			navigationStartDate.setHours(0);
			return navigationStartDate;
		}
	}

	/**
	 * Дата окончания последнего круиза теплохода. Всегда сдвигается на конец суток, независимо
	 * от времени прибытия.
	 * @type {Date}
	 */
	get navigationEndDate(): Date | undefined {
		const cruises = [ ...this.cruises() ];
		if (!cruises.length) return;
		else {
			const max = Math.max( ...cruises.map( cruise => +( cruise.arrival ?? -Infinity ) ) );
			if (Number.isFinite( max )) {
				const navigationEndDate = new Date( max );
				navigationEndDate.setMilliseconds(999);
				navigationEndDate.setSeconds(59);
				navigationEndDate.setMinutes(59);
				navigationEndDate.setHours(23);
				return navigationEndDate;
			}
			else return;
		}
	}

	/**
	 * Получить все круизы теплохода.
	 * @yields {Cruise}
	 */
	*cruises(): Iterable<Cruise> {
		for (const index of cache.activeCruises) {
			const cruise = cache.cruises.at( index );
			if (cruise.ship === this) yield cruise;
		}
	}

	/**
	 * Круизы, выполняемые в указанное время.
	 * @param {Date} datetime - Дата и время круиза.
	 * @returns {Cruise[]} Список круизов.
	 * @description Если в указанное время теплоход не занят в круизе, то проверяются круизы,
	 * отправляющиеся в этот же день, но позже заданного момента времени. Если и таких нет,
	 * то проверяются круизы, завершённые ранее в этот же день. Если ничего не найдено,
	 * возвращается пустой список.
	 */
	cruisesOn( datetime: Date ): Cruise[] {
		const moment = +datetime;
		const dateObj = new Date( moment );
		dateObj.setMilliseconds(0);
		dateObj.setSeconds(0);
		dateObj.setMinutes(0);
		dateObj.setHours(0);
		const dayStart = +dateObj;
		const dayEnd = dayStart + 86399999;
		const found: Cruise[] = [];
		const arrived: Cruise[] = [];
		const departing: Cruise[] = [];
		for (const index of cache.activeCruises) {
			const cruise = cache.cruises.at( index );
			if (cruise.ship === this) {
				if (+( cruise.departure ?? 0 ) <= moment && +( cruise.arrival ?? 0 ) >= moment) {
					found.push( cruise );
				}
				else if (+( cruise.departure ?? 0 ) >= dayStart && +( cruise.departure ?? 0 ) <= dayEnd) {
					departing.push( cruise );
				}
				else if (+( cruise.arrival ?? 0 ) >= dayStart && +( cruise.arrival ?? 0 ) <= dayEnd) {
					arrived.push( cruise );
				}
			}
		}
		if (!found.length) {
			if (departing.length) found.push( ...departing );
			else if (arrived.length) found.push( ...arrived );
		}
		return found;
	}

	/**
	 * Круиз, выполняемый в указанное время.
	 * @param {Date} datetime - Дата и время круиза.
	 * @returns {Cruise} Объект данных круиза.
	 * @description Если в указанное время выполняется несколько круизов, возвращается тот,
	 * который начался первым. Если несколько круизов начались одновременно, возвращается самый
	 * продолжительный из них.
	 */
	cruiseOn( datetime: Date ): Cruise | undefined {
		const cruises = this.cruisesOn( datetime );
		let i = 0;
		while (i < cruises.length - 1 && +cruises[ i + 1 ].departure === +cruises[0].departure) i++;
		return cruises[ i ];
	}

	/**
	 * Асинхронно получает положение теплохода на карте в заданный момент времени.
	 * @param {Date} datetime - Дата и время на карте.
	 * @returns {Promise<TrackPoint>}
	 * @description Если трек круиза ещё не загружен, результат возвращается после загрузки
	 * трека. Если трек уже загружен, то результат будет доступен в следующем цикле выполнения
	 * скрипта.
	 */
	async positionAt( datetime: Date ): Promise<TrackPoint> {
		const cruise = this.cruiseOn( datetime );
		if (cruise) {
			return ( await cruise.route ).positionAt( datetime );
		}
		else {
			return { lat: 0, lng: 0, arrival: datetime, isStop: false };
		}
	}
}

/** Непосредственно загрузчик данных. */
class APIConnector {

	public baseUrl: string;

	/** @param {string} baseUrl - базовый URL API. */
	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	/**
	 * Запросить данные с сервера.
	 * @param {string} url - путь интерфейса API относительно базового URL.
	 * @param {Object} [data={}] - параметры запроса.
	 * @returns {Promise}
	 * @description При возникновении ошибки делает три попытки загрузки с увеличивающимся
	 * интервалом между попытками. Если ни одна попытка не завершилась успехом, возвращает null.
	 */
	async send(url: string, data: any = {}): Promise<any> {
		let sleepTime = 2000;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				const response = await fetch(`${this.baseUrl}/${url}`, {
					method: 'POST',
					body: JSON.stringify(data),
					headers: {'content-type': 'application/json'},
				});
				if (!response.ok) throw new Error( 'Data fetching error.' );
				const result = await response.json();
				if (result?.errors) throw new Error( result.errors.join( '; ' ) );
				return result;
			}
			catch (e) {
				await new Promise( resolve => setTimeout( resolve, sleepTime ) );
				sleepTime *= 2;
			}
		}
		return null;
	}

}

const connector = new APIConnector( apiURL );

/**
 * Функция валидации входящих данных.
 * @param {("cruise"|"company"|"ship")} type - Тип данных.
 * @param data - Данные, полученные от сервера.
 * @returns {boolean} Данные пригодны для использования.
 * @todo Функция недоделана. В настоящее время грубо проверяются только данные круизов,
 * потому что в процессе разработки карты с ними были проблемы.
 */
function dataIsSane( type: 'cruise' | 'company' | 'ship', data: any ): boolean {
	switch (type) {
		case 'cruise' :
		return !!data.shipId &&
			!!data.departure &&
			!!data.arrival;
	}
	return true;
}

let trackFetchingTasks = 0;
let cruiseTracksToFetch: Record<string, ( data: any ) => void> = {};
/**
 * Поставить трек в очередь на загрузку.
 * @param {string} id - ID круиза.
 * @returns {Promise} Промис, возвращающий полученные данные.
 * @description Выполняет первый этап загрузки трека. На первом этапе ID круизов накапливаются и
 * с небольшим таймаутом отправляются на сервер в одном запросе.
 */
function fetchCruiseTracks( id: string ) {
	const ret: Promise<any[]> = new Promise( resolve => {
		cruiseTracksToFetch[ id ] = resolve;
	} );
	setTimeout( async () => {
		const entries = Object.entries( cruiseTracksToFetch );
		if (entries.length) {
			trackFetchingTasks++;
			let resolvers;
			if (entries.length > 50) {
				resolvers = Object.fromEntries( entries.slice( 0, 50 ) );
				cruiseTracksToFetch = Object.fromEntries( entries.slice( 50 ) );
			}
			else {
				resolvers = cruiseTracksToFetch;
				cruiseTracksToFetch = {};
			}
			const ids = Object.keys( resolvers );
			const data = await connector.send( apiEntries.points, { id: ids, progress: 1 } );
			for (const id of ids) {
				resolvers[ id ]( data?.[ id ] ?? [] );
			}
			trackFetchingTasks--;
			if (!trackFetchingTasks && !progressiveFetchingTasks) doFetchTracks();
		}
	}, 10 );

	return ret;
}

interface CruiseTracksToFetchItem {
	id: string;
	stage: number;
	highPriority: boolean;
	promise: Promise<any>;
	resolver?: ( data: any ) => void;
}

let tracksFetching = false;
const cruiseTracksToFetchQueue: CruiseTracksToFetchItem[] = [];
/**
 * Поставить трек в очередь на загрузку.
 * @param {string} id - ID круиза.
 * @param {number} stage - Этап загрузки.
 * @param {boolean} [highPriority=false] - Загрузка с высоким приоритетом.
 * @returns {Promise} Промис, возвращающий полученные данные.
 * @description Выполняет последующие этапы загрузки. На этом этапе треки загружаются по одному
 * в каждом запросе, до 5 запросов выполняются одновременно. При высоком приоритете трек ставится
 * в начало, а не в конец очереди. Эту функцию можно вызывать несколько раз для одного ID, чтобы
 * изменить приоритет загрузки.
 */
function queueFetchTrackProgressive( id: string, stage: number, highPriority: boolean = false ) {
	const index = cruiseTracksToFetchQueue.findIndex( item => item.id === id );
	if (index >= 0) {
		const item = cruiseTracksToFetchQueue[ index ];
		if (item.highPriority !== highPriority) {
			cruiseTracksToFetchQueue.splice( index, 1 );
			item.highPriority = highPriority;
			if (highPriority) cruiseTracksToFetchQueue.unshift( item );
			else cruiseTracksToFetchQueue.push( item );
		}
		return item.promise;
	}
	else {
		let resolver;
		const item: CruiseTracksToFetchItem = {
			id,
			stage,
			highPriority,
			promise: new Promise( resolve => { resolver = resolve; } )
		};
		item.resolver = resolver;
		if (highPriority) cruiseTracksToFetchQueue.unshift( item );
		else cruiseTracksToFetchQueue.push( item );

		if (!progressiveFetchingTasks) doFetchTracks();

		return item.promise;
	}
}

let progressiveFetchingTasks = 0;
/**
 * Выполняет загрузку треков, поставленных в очередь функцией queueFetchTrackProgressive.
 * @returns {void}
 */
function doFetchTracks() {
	if (progressiveFetchingTasks < 5 && !trackFetchingTasks && !!cruiseTracksToFetchQueue.length) {
		while (progressiveFetchingTasks < 5 && !!cruiseTracksToFetchQueue.length) {
			progressiveFetchingTasks++;
			const item = cruiseTracksToFetchQueue.shift();
			const fetching =
				connector.send( apiEntries.points, { id: item.id, progress: item.stage } )
				.then( data => data?.[ item.id ] ?? [] );
			fetching.then( () => {
				progressiveFetchingTasks--;
				if (!!cruiseTracksToFetchQueue.length) doFetchTracks();
			} );
			item.resolver( fetching );
		}
	}
}

/**
 * Отменить загрузку трека.
 * @param {string} id - ID круиза.
 * @returns {void}
 * @description Если загрузка трека уже начата, она не будет остановлена. Если трек находится в
 * очереди на загрузку, то он будет удалён из очереди.
 */
function cancelFetchTrack( id: string ) {
	const index = cruiseTracksToFetchQueue.findIndex( item => item.id === id );
	if (index >= 0) cruiseTracksToFetchQueue.splice( index, 1 );
}

let cruiseSightsToFetch: Record<string, ( data: any ) => void> = {};
/**
 * Получить достопримечательности для круиза.
 * @param {string} id - ID круиза.
 * @returns {Promise} Промис, возвращающий полученные данные.
 * @description Как и функция fetchCruiseTracks, эта функция выполняет загрузку для нескольких
 * круизов в одном запросе после небольшого таймаута. Эта функция загружает только список ID мест
 * для круиза, но не сами данные. Поскольку достопримечательности повторяются для разных круизов,
 * то сами данные могут уже находиться в кэше.
 */
function fetchCruiseSights( id: string ) {
	const ret: Promise<any[]> = new Promise( resolve => {
		cruiseSightsToFetch[ id ] = resolve;
	} );
	setTimeout( async () => {
		const ids = Object.keys( cruiseSightsToFetch );
		if (ids.length) {
			const resolvers = cruiseSightsToFetch;
			cruiseSightsToFetch = {};
			const data = await connector.send( apiEntries.cruiseSights, { id: ids } );
			for (const id of ids) {
				resolvers[ id ]( data?.[ id ] ?? [] );
			}
		}
	}, 10 );

	return ret;
}

let sightsToFetch: Record<string, true> = {};
/**
 * Получить данные достопримечательностей по их ID.
 * @param {string[]} ids - Список ID достопримечательностей.
 * @returns {Promise} Промис, возвращающий полученные данные.
 * @description Как и функция fetchCruiseTracks, эта функция накапливает ID достопримечательностей
 * в течение небольшого таймаута и затем загружает их в одном запросе. Загруженные данные помещаются
 * в кэш и могут разделяться между разными круизами.
 */
async function fetchSights( ids: string[] ) {
	ids.forEach( id => sightsToFetch[ id ] = true );
	await new Promise( resolve => { setTimeout( resolve, 10 ); } );
	const newIds = Object.keys( sightsToFetch ).filter( id => !cache.sights[ id ] );
	sightsToFetch = {};
	if (newIds.length) {
		const dataPromise = connector.send( apiEntries.sightsByIds, { id: newIds } );
		newIds.forEach( id => { ( cache.sights[ id ] as any ) = dataPromise; } );
		const data = await dataPromise;
		( data || [] ).forEach( ( item: any ) => {
if (process.env.NODE_ENV === 'production') {
			cache.sights[ item.id ] = {
				id: item.id,
				type: LocationType.SHOWPLACE,
				lat: item.lat,
				lng: item.lng,
				name: item.name,
				category: item.category,
				image: item.image ?? '',
				link: item.url ?? '',
			};
}
else {
			cache.sights[ item.id ] = {
				id: item.id,
				type: LocationType.SHOWPLACE,
				lat: item.lat,
				lng: item.lng,
				name: item.name,
				category: item.category,
				//~ description: item.description,
				image: item.image ? ( /^https?:\/\//.test( item.image ) ? '' : siteURL ) + item.image : '',
				link: item.url ? ( /^https?:\/\//.test( item.url ) ? '' : siteURL ) + item.url : ''
			};
}
		} );
	}

	const promisesSet = new Set;
	ids.forEach( id => {
		if (cache.sights[ id ] instanceof Promise) promisesSet.add( cache.sights[ id ] );
	} );
	const promises = [ ...promisesSet.values() ];
	if (promises.length) await Promise.all( promises );
}

/**
 * Получить данные стоянок.
 * @returns {Promise} Пустой промис, сигнализирующий о завершении операции.
 * @description Поскольку стоянок относительно немного, они загружаются все сразу и помещаются
 * в кэш. По окончании загрузки срабатывает событие trackstops-loaded.
 */
async function fetchStops() {
	const data = await connector.send( apiEntries.stops );
	cache.stops = ( data || [] ).reduce(
		( ret: Record<string, Location>, item: any ) => {
if (process.env.NODE_ENV === 'production') {
			ret[ item.id ] = {
				id: item.id,
				type: LocationType.REGULAR,
				lat: item.lat,
				lng: item.lng,
				name: item.name,
				image: item.image ?? '',
				link: item.url ?? '',
			};
}
else {
			ret[ item.id ] = {
				id: item.id,
				type: LocationType.REGULAR,
				lat: item.lat,
				lng: item.lng,
				name: item.name,
				//~ description: item.description,
				image: item.image ? ( /^https?:\/\//.test( item.image ) ? '' : siteURL ) + item.image : '',
				link: item.url ? ( /^https?:\/\//.test( item.url ) ? '' : siteURL ) + item.url : ''
			};
}
			return ret;
		}, {}
	) as Record<string, Location>;
	window.dispatchEvent( new Event( 'trackstops-loaded' ) )
}

/**
 * Получить данные шлюзов.
 * @returns {Promise} Пустой промис, сигнализирующий о завершении операции.
 * @description Поскольку шлюзов относительно немного, они загружаются все сразу и помещаются
 * в кэш. По окончании загрузки срабатывает событие gateways-loaded.
 */
async function fetchGateways() {
	const data = await connector.send( apiEntries.gateways );
	cache.gateways = ( data || [] ).reduce(
		( ret: Record<string, Location>, item: any ) => {
			ret[ item.id ] = {
				id: item.id,
				type: LocationType.GATEWAY,
				lat: item.lat,
				lng: item.lng,
				name: item.name
			};
			return ret;
		}, {}
	) as Record<string, Location>;
	window.dispatchEvent( new Event( 'gateways-loaded' ) )
}

/**
 * Получить начальные данные круизов.
 * @returns {Promise} Пустой промис, сигнализирующий о завершении операции.
 * Функция вызывается в процессе загрузки и получает с сервера данные всех круизов,
 * но без включения треков и достопримечательностей. После загрузки круизов срабатывает событие
 * cruisesDataLoaded, затем начинается загрузка стоянок и шлюзов.
 */
async function fetchStartCruises() {
	const { cruises, ships, companies } = ( await connector.send( apiEntries.start ) ) ?? {};
	for (const company of Object.values( companies ?? {} ) as any) {
		if (dataIsSane( 'company', company )) {
			cache.companies.add( new CompanyData( company ) );
		}
	}
	for (const ship of Object.values( ships ?? {} ) as any) {
		if (dataIsSane( 'ship', ship )) {
			cache.ships.add( new ShipData( ship ) );
		}
	}
	for (const cruise of Object.values( cruises ?? {} ) as any) {
		if (dataIsSane( 'cruise', cruise )) {
			cache.cruises.add( new CruiseData( cruise ) );
		}
	}
	cache.setFilter({});
	window.dispatchEvent( new Event( 'cruisesDataLoaded' ) );
	await fetchStops();
	await fetchGateways();
	return;
}

/**
 * Получить начальные данные для карты одного круиза.
 * @param {string} cruiseId - ID круиза.
 * @returns {Promise} Пустой промис, сигнализирующий о завершении операции.
 * В отличие от основного режима работы карты, для одного круиза загружаются сразу все данные,
 * включая достопримечательности и трек маршрута. После завершения загрузки срабатывает событие
 * cruisesDataLoaded.
 */
async function fetchStartSingleCruise( cruiseId: string ) {
	const { ship, company, 'stops-data': stops, 'sights-data': sights, gateways, ...cruise } = ( await connector.send( apiEntries.startCruise, { id: cruiseId } ) ) ?? {};

	if (dataIsSane( 'company', company )) {
		cache.companies.add( new CompanyData( company ) );
	}
	if (dataIsSane( 'ship', ship )) {
		cache.ships.add( new ShipData( ship ) );
	}

	if (dataIsSane( 'cruise', cruise )) {
		cache.stops = ( stops || [] ).reduce(
			( ret: Record<string, Location>, item: any ) => {
if (process.env.NODE_ENV === 'production') {
				ret[ item.id ] = {
					id: item.id,
					type: LocationType.REGULAR,
					lat: item.lat,
					lng: item.lng,
					name: item.name,
					image: item.image ?? '',
					link: item.url ?? '',
				};
}
else {
				ret[ item.id ] = {
					id: item.id,
					type: LocationType.REGULAR,
					lat: item.lat,
					lng: item.lng,
					name: item.name,
					//~ description: item.description,
					image: item.image ? ( /^https?:\/\//.test( item.image ) ? '' : siteURL ) + item.image : '',
					link: item.url ? ( /^https?:\/\//.test( item.url ) ? '' : siteURL ) + item.url : ''
				};
}
				return ret;
			}, {}
		) as Record<string, Location>;

		( sights || [] ).forEach( ( item: any ) => {
if (process.env.NODE_ENV === 'production') {
			cache.sights[ item.id ] = {
				id: item.id,
				type: LocationType.SHOWPLACE,
				lat: item.lat,
				lng: item.lng,
				name: item.name,
				category: item.category,
				image: item.image ?? '',
				link: item.url ?? '',
			};
}
else {
			cache.sights[ item.id ] = {
				id: item.id,
				type: LocationType.SHOWPLACE,
				lat: item.lat,
				lng: item.lng,
				name: item.name,
				category: item.category,
				//~ description: item.description,
				image: item.image ? ( /^https?:\/\//.test( item.image ) ? '' : siteURL ) + item.image : '',
				link: item.url ? ( /^https?:\/\//.test( item.url ) ? '' : siteURL ) + item.url : ''
			};
}
		} );

		cache.gateways = ( gateways || [] ).reduce(
			( ret: Record<string, Location>, item: any ) => {
				ret[ item.id ] = {
					id: item.id,
					type: LocationType.GATEWAY,
					lat: item.lat,
					lng: item.lng,
					name: item.name
				};
				return ret;
			}, {}
		) as Record<string, Location>;

		cache.cruises.add( new CruiseData( cruise ) );
		cache.setFilter({});

		window.dispatchEvent( new Event( 'cruisesDataLoaded' ) );
	}
}

/**
 * Получить начальные данные для карты стоянок или мест.
 * @param {("stops"|sights)} type - Тип загружаемых объектов.
 * @param {(string|string[])} [id] - Один ID или список ID объектов.
 * @returns {Promise} Пустой промис, сигнализирующий о завершении операции.
 * Пустой список ID допускается, но ничего загружено не будет. По окончании загрузки срабатывает
 * событие cruisesDataLoaded.
 */
async function fetchStartLocations( type: string, id?: string | string[] ) {
	let result;

	if (!id || ( Array.isArray( id ) && !id.length )) {
		await Promise.resolve();
		result = {};
	}
	else {
		const url = type === 'stops' ? apiEntries.startStops : apiEntries.startSights;

		const data = await connector.send( url, { id } );
		result = ( data || [] ).reduce(
			( ret: Record<string, Location>, item: any ) => {
if (process.env.NODE_ENV === 'production') {
				ret[ item.id ] = {
					id: item.id,
					type: type === 'stops' ? LocationType.REGULAR : LocationType.SHOWPLACE,
					lat: item.lat,
					lng: item.lng,
					name: item.name,
					image: item.image ?? '',
					link: item.url ?? '',
				};
}
else {
				ret[ item.id ] = {
					id: item.id,
					type: type === 'stops' ? LocationType.REGULAR : LocationType.SHOWPLACE,
					lat: item.lat,
					lng: item.lng,
					name: item.name,
					//~ description: item.description,
					image: item.image ? ( /^https?:\/\//.test( item.image ) ? '' : siteURL ) + item.image : '',
					link: item.url ? ( /^https?:\/\//.test( item.url ) ? '' : siteURL ) + item.url : ''
				};
}
				if (type === 'sights') {
					ret[ item.id ].category = item.category;
				}
				return ret;
			}, {}
		) as Record<string, Location>;
	}

	if (type === 'stops') cache.stops = result;
	else cache.sights = result;

	window.dispatchEvent( new Event( 'cruisesDataLoaded' ) );
}

/**
 * Кэш загруженных данных.
 */
class Cache {
	activeCruises : number[] = [];
	companies = new SortedList<Company>( ( a, b ) => a.name.localeCompare( b.name, 'ru', { ignorePunctuation: true } ) );
	ships = new SortedList<Ship>( ( a, b ) => a.name.localeCompare( b.name, 'ru', { ignorePunctuation: true } ) );
	cruises = new SortedList<Cruise>( ( a, b ) =>
		+a.departure - +b.departure ||
		+a.arrival - +b.arrival ||
		a.name.localeCompare( b.name, 'ru', { ignorePunctuation: true } )
	);
	stops: Record<string, Location> = null;
	sights: Record<string, Location | Promise<any>> = {};
	gateways: Record<string, Location> = null;
}

/**
 * Интерфейс для получения всех данных от API.
 */
class CruiseAPICache extends Cache implements CruiseAPI {
	activeFilters: {
		companyName?: string,
		shipName?: string,
		startDate?: Date | null,
		endDate?: Date | null
	} = {};

	/**
	 * @param {("cruise"|"stops"|"single-stop"|"places"|"single-place"|"default")} mapMode -
	 *     Режим работы карты.
	 * @param {string} [entityId] - ID загружаемого объекта для режимов "cruise", "single-stop",
	 *     "single-place". В других режимах не используется.
	 */
	constructor( mapMode: string, entityId: string ) {
		super();
		switch (mapMode) {
		case 'cruise':
			fetchStartSingleCruise( entityId );
			break;
		case 'stops':
			fetchStartLocations( 'stops', ( window.frameElement as HTMLIFrameElement )?.dataset.ids?.split(',') ?? [] );
			break;
		case 'single-stop':
			fetchStartLocations( 'stops', entityId );
			break;
		case 'places':
			fetchStartLocations( 'sights', ( window.frameElement as HTMLIFrameElement )?.dataset.ids?.split(',') ?? [] );
			break;
		case 'single-place':
			fetchStartLocations( 'sights', entityId );
			break;
		default:
			fetchStartCruises();
		}
	}

	/**
	 * Самая ранняя дата начала навигации среди всех круизов.
	 * @type {Date}
	 */
	get navigationStartDate(): Date | undefined {
		if (!this.activeCruises.length) return;
		else {
			const datetime = this.cruises.at( this.activeCruises[0] ).departure;
			if (datetime) {
				const navigationStartDate = new Date( +datetime );
				navigationStartDate.setMilliseconds(0);
				navigationStartDate.setSeconds(0);
				navigationStartDate.setMinutes(0);
				navigationStartDate.setHours(0);
				return navigationStartDate;
			}
			else return;
		}
	}

	/**
	 * Самая поздняя дата окончания навигации среди всех круизов.
	 * @type {Date}
	 */
	get navigationEndDate(): Date | undefined {
		if (!this.activeCruises.length) return;
		else {
			const max = Math.max( ...this.activeCruises.map( index => +( this.cruises.at( index ).arrival ?? -Infinity ) ) );
			if (Number.isFinite( max )) {
				const navigationEndDate = new Date( max );
				navigationEndDate.setMilliseconds(999);
				navigationEndDate.setSeconds(59);
				navigationEndDate.setMinutes(59);
				navigationEndDate.setHours(23);
				return navigationEndDate;
			}
			else return;
		}
	}

	/**
	 * Получить компанию по ID.
	 * @param {string} id - ID круизной компании.
	 * @returns {Company} - Объект данных круизной компании.
	 */
	company( id : string ) : Company {
		return this.companies.item( id );
	}

	/**
	 * Получить круиз по ID.
	 * @param {string} id - ID круиза.
	 * @returns {Cruise} - Объект данных круиза.
	 */
	cruise( id : string ) : Cruise {
		return this.cruises.item( id );
	}

	/**
	 * Получить теплоход по ID.
	 * @param {string} id - ID теплохода.
	 * @returns {Ship} - Объект данных теплохода.
	 */
	ship( id : string ) : Ship {
		return this.ships.item( id );
	}

	/**
	 * Получить все круизы.
	 * @yields {Cruise} - Объект данных круиза.
	 */
	*allCruises(): Iterable<Cruise> {
		for (const index of this.activeCruises) {
			yield this.cruises.at( index );
		}
	}

	/**
	 * Получить все теплоходы.
	 * @yields {Ship} - Объект данных теплохода.
	 */
	*allShips(): Iterable<Ship> {
		const shipIds: Record<string, true> = {};
		for (const index of this.activeCruises) {
			const id = this.cruises.at( index ).ship.id;
			shipIds[ id ] = true;
		}
		yield* this.ships.filter( ship => shipIds[ ship.id ] );
	}

	/**
	 * Получить все круизные компании.
	 * @yields {Company} - Объект данных компании.
	 */
	*allCompanies(): Iterable<Company> {
		const companyIds: Record<string, true> = {};
		for (const ship of this.allShips()) {
			companyIds[ ship.company.id ] = true;
		}
		yield* this.companies.filter( company => companyIds[ company.id ] );
	}

	/**
	 * Список всех стоянок.
	 * @type {Location[]}
	 */
	get allStops(): Location[] {
		if (this.stops) return Object.values( this.stops );
		else return [];
	}

	/**
	 * Список всех уже загруженных достопримечательностей.
	 * @type {Location[]}
	 */
	get allSights(): Location[] {
		return Object.values( this.sights ).filter( item => !( item instanceof Promise ) ) as Location[];
	}

	/**
	 * Установить фильтр теплоходов и круизов.
	 * @param {Object} options
	 * @param {string} [options.companyName] - Фильтр по названию компании.
	 * @param {string} [options.shipName] - Фильтр по названию теплохода.
	 * @param {Date|null} [options.startDate] - Начальная дата периода.
	 * @param {Date|null} [options.endDate] - Завершающая дата периода.
	 * @description Если какой-либо параметр не задан, то он игнорируется. Если задана пустая
	 * строка или null для дат, то соответствующий фильтр сбрасывается. Если параметр задан и
	 * не пустой, то фильтр устанавливается. После установки фильтра функции, возвращающие
	 * списки компаний, теплоходов, круизов, даты навигации, работают с учётом фильтра.
	 */
	setFilter( options: { companyName?: string, shipName?: string, startDate?: Date | null, endDate?: Date | null } ) {
		for (const key of [ 'companyName', 'shipName', 'startDate', 'endDate' ]) {
			if (key in options) (this.activeFilters as any)[ key ] = (options as any)[ key ];
		}
		this.activeCruises = [ ...this.cruises.items.keys() ].filter( index => {
			const cruise = this.cruises.at( index );
			let ret = true;
			if (this.activeFilters.companyName || this.activeFilters.shipName) {
				ret =
					( this.activeFilters.companyName && cruise.company?.name.toLowerCase().includes( this.activeFilters.companyName.toLowerCase() ) )
					||
					( this.activeFilters.shipName && cruise.ship?.name.toLowerCase().includes( this.activeFilters.shipName.toLowerCase() ) );
			}
			if (ret && this.activeFilters.startDate && ( !cruise.departure || cruise.departure < this.activeFilters.startDate )) ret = false;
			if (ret && this.activeFilters.endDate && ( !cruise.arrival || cruise.arrival > this.activeFilters.endDate )) ret = false;
			return ret;
		} );
	};
}

let cache: CruiseAPICache;

/**
 * Выполнить инициализацию API и кэша.
 * @param {("cruise"|"stops"|"single-stop"|"places"|"single-place"|"default")} mapMode - Режим работы карты.
 * @param {string} [entityId] - ID загружаемого объекта для режимов "cruise", "single-stop", "single-place".
 *     В других режимах не используется.
 * @returns {CruiseAPI} Созданный объект API.
 */
export default function init( mapMode: string, entityId: string ) {
	cache = new CruiseAPICache( mapMode, entityId );
	return cache;
}

/**
 * Парсит дату из исходных данных.
 * @param {string} dateString - Текстовые дата и время. Либо "ДД.ММ.ГГГГ ЧЧ:ММ:СС",
 *     либо "ГГГГ-ММ-ДД ЧЧ:ММ:СС".
 * @returns {Date} Объект даты и времени.
 */
function parseDate(dateString: string): Date {
	let match = dateString
		.match(/(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2}):(\d{2})?/);
	if (match) {
		const [, day, month, year, hour, minute, second = '00'] = match;
		return new Date(+year, +month - 1, +day, +hour, +minute, +second);
	}

	return new Date( dateString );
}
