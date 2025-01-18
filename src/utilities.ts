export class TodoError extends Error {
	constructor() {
		super(`Todo!`);
	}
}
/**
 * @throws TodoError
 * */
export function todo(): never {
	throw new TodoError();
}
