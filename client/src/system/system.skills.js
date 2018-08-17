
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

/* System which handles the skill advancement. */
System.Skills = function(compTypes) {
    System.Base.call(this, RG.SYS.SKILLS, compTypes);

    this.updateEntity = function(ent) {
        const comps = ent.getList('SkillsExp');
        const entSkills = ent.get('Skills');
        const cell = ent.getCell();

        comps.forEach(comp => {
            const skillName = comp.getSkill();
            if (!entSkills.hasSkill(skillName)) {
                entSkills.addSkill(skillName);
                RG.gameSuccess({cell,
                    msg: `${ent.getName()} learns a skill ${skillName}`});
            }
            const points = comp.getPoints();

            entSkills.addPoints(skillName, points);

            const currPoints = entSkills.getPoints(skillName);
            const currLevel = entSkills.getLevel(skillName);

            // TODO make a proper function to check the skill threshold
            if (currPoints >= (10 * currLevel)) {
                const name = ent.getName();
                entSkills.setLevel(skillName, currLevel + 1);
                entSkills.resetPoints(skillName);
                RG.gameSuccess({cell,
                    msg: `${name} advances a skill ${skillName}`});

                const expPts = new RG.Component.ExpPoints(10 * currLevel);
                ent.add(expPts);
                RG.gameSuccess({cell,
                    msg: `${name} gains experience from skill ${skillName}`});
            }

            ent.remove(comp);
        });
    };

};
RG.extend2(System.Skills, System.Base);

module.exports = System.Skills;
