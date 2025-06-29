import { HMItem } from './item.js';

export class HMSkillItem extends HMItem {
    prepareBaseData() {
        super.prepareBaseData();
    }

    prepareDerivedData() {
        super.prepareDerivedData();
        if (!this.actor) return;

        const actorData = this.actor.system;
        const {bonus, relevant, universal} = this.system;

        if (this.actor.type === 'character') {
            const abilities = actorData.abilities.total;

            // It's not clear why this third term is needed, now.
            // Sometimes actgorData.abilities.total is null.
            // TODO: Fix this properly.
            if (universal && !bonus.mastery.value && abilities) {
                const stack = [];
                Object.keys(relevant).forEach((key) => {
                    if (relevant[key]) stack.push(abilities[key].value);
                });
                const value = Math.min(...stack);
                bonus.stats = {value, 'literacy': value, 'verbal': value};
            } else { delete bonus.stats; }
        }

        const actorBonus = actorData.bonus;
        const stateBonus = actorBonus?.state?.skills || 0;
        const honorBonus = actorBonus?.honor?.skills || 0;
        bonus.state = {value: stateBonus, literacy: stateBonus, verbal: stateBonus};
        bonus.honor = {value: honorBonus, literacy: honorBonus, verbal: honorBonus};

        Object.keys(bonus.total).forEach((key) => {
            bonus.total[key] = Object.keys(bonus)
                                .filter((v) => v !== 'total')
                                .reduce((acc, value) => acc + bonus[value][key] || 0, 0);
        });
    }
}
