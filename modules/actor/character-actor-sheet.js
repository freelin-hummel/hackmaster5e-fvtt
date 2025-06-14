import { HMActorSheet } from './actor-sheet.js';

function prepareCharacterItems(sheetData) {
    const {actor} = sheetData;
    const {itemTypes} = actor;

    const proficiency = actor.itemTypes.proficiency;
    actor.proficiency = proficiency.sort(
        (a, b) => b.system.weapon.checked - a.system.weapon.checked || a.name.localeCompare(b.name),
    );

    // Assign
    actor.race = itemTypes.race?.[0];
    actor.cclass = itemTypes.cclass?.[0];
}

export class HMCharacterActorSheet extends HMActorSheet {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['hackmaster', 'sheet', 'actor'],
            width: 835,
            height: 930,
            resizable: true,
            scrollY: ['.scrollable'],
            tabs: [
                { navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'skills' },
                { navSelector: '.bio-tabs',   contentSelector: '.bio-body',   initial: 'wealth' },
            ],
        });
    }

    /** @override */
    getData() {
        const data = super.getData();

        prepareCharacterItems(data);
        return data;
    }

    _HMprepareSheet(sheetData) { /* eslint-disable-line class-methods-use-this */
        const actorData = sheetData.actor;

        // Saves
        const left = ['fos', 'foa', 'turning', 'morale'];
        const right = ['physical', 'mental', 'dodge', 'poison', 'trauma'];
        actorData.saves = {left, right};
    }
}
