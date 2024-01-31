
class UniqueIdGenerator {
	#uniqueIds; /** {object} A mapping from names to counter */
	#delimiter; /** {string} A delimiter to be used to create unique IDs */

	/**
	 * Creates a new instance of this class.
	 * @param {string} delimiter A delimiter between the unique ID and the unique counter.
	 */
	constructor(delimiter) {
		this.#uniqueIds = {};
		this.#delimiter = delimiter;
	}

	/**
	 * Removes all unique IDs from cache.
	 */
	clear() {
		this.#uniqueIds = {};
	}

	/**
	 * Generates a new unique ID with unique counter as prefix.
	 * @param {string} uniqueId The name of the ID.
	 * @return {string} The name with counter ID as prefix.
	 */
	getNewUniqueId(uniqueId) {
		if (uniqueId.search(this.#delimiter) !== -1)
			throw new Error(`UniqueIdGenerator :: #getNewUniqueId :: unique ID can't have the following delimiter: ${this.#delimiter} ; uniqueId=${uniqueId}`);

		if (!this.#uniqueIds.hasOwnProperty(uniqueId))
			this.#uniqueIds[uniqueId] = -1;

		return `${++this.#uniqueIds[uniqueId]}${this.#delimiter}${uniqueId}`;
	}

	/**
	 * Split a valid unique ID into his count and name.
	 * @param {string} uniqueId The unique ID.
	 * @return {{count: number, name: string}} A split of the given unique ID.
	 */
	getUniqueIdComponents(uniqueId) {
		const [count, name] = uniqueId.split(this.#delimiter);
		return {
			count: Number(count),
			name
		};
	}
}

module.exports = {
	UniqueIdGenerator
}
