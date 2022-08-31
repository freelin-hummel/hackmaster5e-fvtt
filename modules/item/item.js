import { HMTABLES, HMCONST } from '../sys/constants.js';
import { HMChatMgr } from '../mgr/chatmgr.js';
import { HMDialogMgr } from '../mgr/dialogmgr.js';
import { HMRollMgr } from '../mgr/rollmgr.js';

// Remember: Items may not alter Actors under any circumstances.
// You will create a free fire shooting gallery if you do this, and
// we are making Hackmaster, not Aces & Eights.

export class HMItem extends Item {
    /** @override */
    prepareData(options={}) {
        this.prepareBaseData(options);
        super.prepareEmbeddedDocuments();
        this.prepareDerivedData();
    }

    /** @override */
    prepareBaseData(options={}) {
        super.prepareBaseData();

        // HACK: This will suffice for now.
        if (typeof this.system?.state === 'object') this._shittyMigrate();
    }

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();
    }

    // TODO: When we do migration for real, ensure typeof data.state === 'integer'
    async _shittyMigrate() {
        await this.update({'data.state': 0});
    }

    get quality() {
        const {data} = this.data;
        const qKey = data?.ranged?.checked ? 'ranged' : this.type;
        const {bonus, qn} = data;
        const values = HMTABLES.quality[qKey].map((a) => a * qn);
        const keys = Object.keys(bonus.total);
        return Object.fromEntries(keys.map((_, i) => [keys[i], values[i]]));
    }

    // HACK: Seriously, now.
    get specname() {
       return HMItem.specname(this.data);
    }

    // HACK: Temporary measure until future inventory overhaul.
    get invstate() {
        // TODO: Migrate
        const state = parseInt(this.data.data.state, 10) || 0;
        return HMTABLES.itemstate[state];
    }

    onClick(event) {
        const itemType = this.type;
        if (itemType === 'wound') { this.WoundAction(event); }
    }

    async WoundAction(event) {
        const element = event.currentTarget;
        const {dataset} = element;
        const itemData = this.data.data;

        let {hp, timer, treated} = itemData;

        if (dataset.action === 'decTimer') timer--;
        if (dataset.action === 'decHp' || timer < 1) timer = --hp;

        if (hp < 0) return this.delete();
        await this.update({'data': {hp, timer, treated}});
    }

    // TODO: The first half of this function could be a lot neater.
    static async rollSkill({skillName, specialty=null, caller, itemId}) {
        const callers = [];
        if (caller) {
            callers.push({caller, context: caller.items.get(itemId)});
        } else {
            const actors = canvas.tokens.controlled.map((token) => token.actor);
            Object.values(actors).forEach(async (actor) => {
                let context;
                if (specialty) {
                    context = actor.items.find((a) => a.type === 'skill'
                        && skillName === a.name
                        && specialty === a.data.data?.specialty?.value);
                } else {
                    context = actor.items.find((a) => a.type === 'skill'
                        && skillName === a.name
                        && !a.data.data?.specialty?.value);
                }
                if (!context) return;
                callers.push({caller: actor, context});
            });
        }
        if (!callers.length) return;

        const dialogDataset = {
            dialog:  'skill',
            itemId:  callers[0].context.id,
            callers: callers.length,
        };

        const dialogMgr = new HMDialogMgr();
        const dialogResp = await dialogMgr.getDialog(dialogDataset, callers[0].caller);

        Object.values(callers).forEach(async (callerObj) => {
            const rollMgr = new HMRollMgr();
            const chatMgr = new HMChatMgr();
            const dataset = {
                dialog: 'skill',
                context: callerObj.context,
                caller:  callerObj.caller,
                resp:    dialogResp.resp,
            };
            dataset.roll = await rollMgr.getRoll(dataset, dataset);
            const card = await chatMgr.getCard({dataset});
            await ChatMessage.create(card);
        });
    }

    static specname(data) {
        const skillName = game.i18n.localize(data.name);
        if (data.type !== 'skill') return skillName;
        const {specialty} = data.data;
        if (specialty.checked && specialty.value.length) {
            return `${skillName} (${specialty.value})`;
        }
        return skillName;
    }

    static async createItem(item, _options, userId) {
        if (game.user.id !== userId) return;
        const {parent, type} = item;
        if (type !== 'wound') return;

        if (!parent.data.data.bonus.total.trauma) return;
        const {top} = parent.data.data.hp;
        const wound = item.data.data.hp;
        if (!top || top >= wound) return;

        const chatmgr = new HMChatMgr();
        const cardtype = HMCONST.CARD_TYPE.ALERT;
        const dataset = {context: item, top, wound};
        const card = await chatmgr.getCard({cardtype, dataset});
        await ChatMessage.create(card);

        // Auto-roll for beasts.
        if (parent.type === 'beast') {
            dataset.dialog = 'save';
            dataset.formulaType = 'trauma';

            const rollMgr = new HMRollMgr();
            const dialogResp = {caller: parent, context: parent};
            dataset.resp = {caller: parent};

            const roll = await rollMgr.getRoll(dataset);
            const rollMode = 'gmroll';
            dialogResp.resp = {rollMode};
            const topcard = await chatmgr.getCard({dataset, roll, dialogResp});
            await ChatMessage.create(topcard);
        }
    }
}
