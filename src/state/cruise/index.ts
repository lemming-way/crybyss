/**
 * @file Интерфейсы для получения данных о круизах по API.
 * @module state
 * @version 1.0.0
 */

export interface CruiseAPI {
	navigationStartDate: Date;
	navigationEndDate: Date;
	company: ( id : string ) => Company;
	cruise: ( id : string ) => Cruise;
	ship: ( id : string ) => Ship;
	allCruises: () => Iterable<Cruise>;
	allShips: () => Iterable<Ship>;
	allCompanies: () => Iterable<Company>;
	setFilter: ( options: { companyName?: string, shipName?: string, startDate?: Date | null, endDate?: Date | null } ) => void;
	allStops: Location[];
	allSights: Location[];
}

export interface Cruise {
	id: string;
	name: string;
	departure: Date;
	arrival: Date;
	departureLocationName: string;
	arrivalLocationName: string;
	url: string;
	ship: Ship;
	company: Company;
	routeReadyStage: number;
	stops: Promise<TrackLocation[]>;
	sights: Promise<TrackLocation[]>;
	gateways: Promise<TrackLocation[]>;
	sunrises: Promise<TrackPoint[]>;
	sunsets: Promise<TrackPoint[]>;
	route: Promise<CruiseRoute>;

	loadTrackProgressive: ( highPriority?: boolean ) => Promise<void>;
	cancelLoadTrack: () => void;
	setHighPriorityLoading: ( highPriority: boolean ) => void;
}

/**
 * Цвет компании по умолчанию, если другой не задан
 * @type {number}
 */
export const defaultCompanyColor = 0x7F7F7F;

export interface Company {
	id: string;
	name: string;
	color: number;
	ships: () => Iterable<Ship>;
	cruises: () => Iterable<Cruise>;
}

export interface Ship {
	id: string;
	name: string;
	navigationStartDate?: Date;
	navigationEndDate?: Date;
	company: Company;
	cruises: () => Iterable<Cruise>;
	cruisesOn: ( datetime: Date ) => Cruise[];
	cruiseOn: ( datetime: Date ) => Cruise | undefined;
	positionAt: ( datetime: Date ) => Promise<TrackPoint>;
}

export interface Location {
	id: string;
	type: LocationType;
	lat: number;
	lng: number;
	name: string;
	category?: string;
	//~ description?: string;
	image?: string;
	link?: string;
}

export interface TrackLocation {
	arrival: Date;
	departure?: Date;
	side?: 'left' | 'right';
	location: Location;
}

export interface TrackPoint {
	lat: number;
	lng: number;
	arrival: Date;
	isStop: boolean;
	side?: 'left' | 'right';
	angle?: number;
}

/**
 * @typedef {Object} Location
 * @property {string} id - ID объекта.
 * @property {LocationType} type - Тип объекта.
 * @property {number} lat - Географическая широта.
 * @property {number} lng - Географическая долгота.
 * @property {string} name - Название объекта.
 * @property {string} [category] - Категория достопримечательностей.
 * @property {string} [image] - URL изображения объекта.
 * @property {string} [link] - URL страницы объекта.
 * @description Объект данных стоянки, достопримечательности, шлюза.
 */

/**
 * @typedef {Object} TrackLocation
 * @property {Date} arrival - Дата и время прибытия на место.
 * @property {Date} [departure] - Дата и время отправления со стоянки.
 * @property {("left"|"right")} [side] - Сторона борта.
 * @property {Location} location - Прочие данные места.
 * @description Информация о прохождении места на карте теплоходом.
 */

/**
 * @typedef {Object} TrackPoint
 * @property {number} lat - Географическая широта.
 * @property {number} lng - Географическая долгота.
 * @property {Date} arrival - Дата и время прибытия на точку.
 * @property {boolean} isStop - Точка является стоянкой.
 * @property {("left"|"right")} [side] - Сторона борта.
 * @property {number} [angle] - Угол направления движения.
 * @description Точка маршрута.
 */

/**
 * Типы мест на карте.
 * @readonly
 * @enum {number}
 */
export enum LocationType {
	REGULAR,
	SHOWPLACE,
	GATEWAY
}

/** Данные маршрута круиза */
export class CruiseRoute {

	declare points: TrackPoint[];

	/**
	 * @param {TrackPoint[]} points
	 */
	constructor(points: TrackPoint[]) {
		this.points = points;
	}

	/**
	 * Определить положение теплохода на маршруте в заданный момент времени.
	 * @param {Date} datetime - Дата и время на карте.
	 * @returns {TrackPoint} Положение теплохода.
	 */
	positionAt( datetime: Date ): TrackPoint {
		if (!this.points.length) {
			return { arrival: datetime, lat: 0, lng: 0, isStop: true };
		}

		const needle = +datetime;
		let sliceStart = 0;
		let sliceEnd = this.points.length - 1;
		let previous = -1;
		while (sliceStart <= sliceEnd) {
			const center = sliceStart + sliceEnd >> 1;
			const arrival = +this.points[center].arrival;
			if (arrival === needle) {
				let index = center;
				while (index < this.points.length - 1 && !this.points[ index ].isStop && this.points[ index ].arrival >= this.points[ index + 1 ].arrival) index++;
				while (index > 0 && !this.points[ index ].isStop && this.points[ index ].arrival <= this.points[ index - 1 ].arrival) index--;
				return this.points[index];
			}
			if (arrival < needle) {
				previous = center;
				sliceStart = center + 1;
			}
			else {
				sliceEnd = center - 1;
			}
		}
		if (previous < 0) {
			return this.points[0];
		}
		else {
			while (previous < this.points.length - 1 && this.points[ previous + 1 ].arrival <= this.points[ previous ].arrival) previous++;
			if (previous >= this.points.length - 1) return this.points[ this.points.length - 1 ];
		};

		const frac = (needle - +this.points[ previous ].arrival) / ( +this.points[ previous + 1 ].arrival - +this.points[ previous ].arrival );
		const lat = this.points[ previous ].lat * ( 1 - frac ) + this.points[ previous + 1 ].lat * frac;
		const lng = this.points[ previous ].lng * ( 1 - frac ) + this.points[ previous + 1 ].lng * frac;
		let angle = undefined;
		if (
			!this.points[ previous ].isStop && this.points[ previous ].angle !== undefined &&
			!this.points[ previous + 1 ].isStop && this.points[ previous + 1 ].angle !== undefined
		) {
			let rot = this.points[ previous + 1 ].angle - this.points[ previous ].angle;
			if (rot > 180) rot -= 360;
			else if (rot < -180) rot += 360;
			rot *= frac;
			angle = this.points[ previous ].angle + rot;
			if (angle > 180) angle -= 360;
			else if (angle < -180) angle += 360;
		}
		else if (!this.points[ previous ].isStop && !this.points[ previous + 1 ].isStop && this.points[ previous ].angle !== undefined) angle = this.points[ previous ].angle;
		else if (!this.points[ previous ].isStop && !this.points[ previous + 1 ].isStop && this.points[ previous + 1 ].angle !== undefined) angle = this.points[ previous + 1 ].angle;

        return { arrival: datetime, lat, lng, angle, isStop: this.points[ previous ].isStop || this.points[ previous + 1 ].isStop };
	}
}
