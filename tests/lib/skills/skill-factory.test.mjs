// skill-factory.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import SkillFactory from "../../../module/lib/skills/skill-factory.mjs";
import {CareerFreeSkill, ErrorSkill, SpecializationFreeSkill, TrainedSkill} from "../../../module/lib/skill.mjs";

/**
 * @returns {SwerpgActor} an actor object
 */
function createActor() {
    return {
        freeSkillRanks: {
            "career": {
                "id": "",
                "name": "",
                "spent": 0,
                "gained": 4,
                "available": 4
            },
            "specialization": {
                "id": "",
                "name": "",
                "spent": 0,
                "gained": 2,
                "available": 2
            }
        },
        experiencePoints: {
            "spent": 0,
            "gained": 0,
            "startingExperience": 100,
            "total": 100,
            "available": 100
        },
        system: {
            skills: {
                "cool": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "discipline": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "negotiation": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "perception": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "vigilance": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "brawl": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "melee": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "rangedlight": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "rangedheavy": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "gunnery": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "astrogation": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "athletics": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "charm": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "coercion": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "computers": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "coordination": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "deception": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "leadership": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "mechanics": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "medicine": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "pilotingplanetary": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "pilotingspace": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "resilience": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "skulduggery": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "stealth": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "streetwise": {
                    "rank": {
                        "base": 1,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 1
                    }
                },
                "survival": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "coreworlds": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "lore": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "outerrim": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "underworld": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "xenology": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                },
                "education": {
                    "rank": {
                        "base": 0,
                        "careerFree": 0,
                        "specializationFree": 0,
                        "trained": 0,
                        "value": 0
                    }
                }
            }
        }
    };
}

describe("Function build()", () => {
    describe("during creation time", () => {
        describe("should create a CareerFreeSkill", () => {
            const expectClassSkill = CareerFreeSkill;
            describe("action is train", () => {
                const action = "train";
                test('click on on a career-free skill only.', () => {
                    const actor = createActor();
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
                test('brand new actor and click on a skill that is both career-free and specialization-free.', () => {
                    const actor = createActor();
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
            })
            describe("action is forget", () => {
                const action = "forget";
                test('click on on a skill either career-free or specialization-free only and has a career-free skill point.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.careerFree = 1;
                    actor.freeSkillRanks = {
                        career: {
                            spent: 1,
                            gained: 4
                        },
                        specialization: {
                            spent: 0,
                            gained: 2
                        }
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
            });
        });
        describe("should create a SpecializationFreeSkill", () => {
            const expectClassSkill = SpecializationFreeSkill;
            describe("action is train", () => {
                const action = "train";
                test('click on a specialization-free skill only.', () => {
                    const actor = createActor();
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
                test('an actor that has spent career-free skill points and click on a skill that is both career-free and specialization-free.', () => {
                    const actor = createActor();
                    actor.freeSkillRanks.career = {
                        spent: 4,
                        gained: 4
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
            });
            describe("action is forget", () => {
                const action = "forget";
                test('click on on a skill either career-free or specialization-free only and has a specialization-free skill point.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.specializationFree = 1;
                    actor.freeSkillRanks = {
                        career: {
                            spent: 0,
                            gained: 4
                        },
                        specialization: {
                            spent: 1,
                            gained: 2
                        }
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
                test('click on on a skill either career-free or specialization-free only and has a both a career-free and a specialization-free skill point.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.specializationFree = 1;
                    actor.system.skills.brawl.rank.careerFree = 1;
                    actor.freeSkillRanks = {
                        career: {
                            spent: 1,
                            gained: 4
                        },
                        specialization: {
                            spent: 1,
                            gained: 2
                        }
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
            });

        });
        describe("should create a TrainedSkill", () => {
            const expectClassSkill = TrainedSkill;
            describe("action is train", () => {
                const action = "train";
                test('click on a skill neither career-free nor specialization-free and actor has no career-free points.', () => {
                    const actor = createActor();
                    actor.freeSkillRanks = {
                        career: {
                            spent: 4,
                            gained: 4,
                            available: 0
                        },
                        specialization: {
                            spent: 2,
                            gained: 2,
                            available: 0
                        }
                    };
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: false
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
                test('an actor that has spent career-free and specialization-free skill points and click on a skill that is both career-free and specialization-free.', () => {
                    const actor = createActor();
                    actor.freeSkillRanks = {
                        career: {
                            spent: 4,
                            gained: 4
                        },
                        specialization: {
                            spent: 2,
                            gained: 2
                        }
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
            });
            describe("action is forget", () => {
                const action = "forget";
                test('click on on a skill with trained points, actor has no free skill point and some experience point spent.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.careerFree = 0;
                    actor.system.skills.brawl.rank.specializationFree = 0;
                    actor.system.skills.brawl.rank.trained = 1;
                    actor.experiencePoints.spent = 10;
                    actor.freeSkillRanks = {
                        career: {
                            spent: 4,
                            gained: 4,
                            available: 0
                        },
                        specialization: {
                            spent: 2,
                            gained: 2,
                            available: 0
                        }
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
            });
        });
        describe("should create a ErrorSkill", () => {
            const expectClassSkill = ErrorSkill;
            describe("action is train", () => {
                const action = "train";
                test('click train on on a skill that is neither career-free nor specialization-free and actor has career-free points', () => {
                    const actor = createActor();
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: false
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                    expect(skill.options.message).toBe("you have to spend free skill points first during character creation!");
                });
                test('click train on on a skill that is neither career-free nor specialization-free and actor has specialization-free points', () => {
                    const actor = createActor();
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: false
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                    expect(skill.options.message).toBe("you have to spend free skill points first during character creation!");
                })
            });
            describe("action is forget", () => {
                const action = "forget";
                test('click on on a skill with trained points, actor has no free skill point and no experience point spent.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.careerFree = 0;
                    actor.system.skills.brawl.rank.specializationFree = 0;
                    actor.system.skills.brawl.rank.trained = 1;
                    actor.freeSkillRanks = {
                        career: {
                            spent: 4,
                            gained: 4,
                            available: 0
                        },
                        specialization: {
                            spent: 2,
                            gained: 2,
                            available: 0
                        }
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectClassSkill);
                });
            });

        });
    });
    describe("during creation time", () => {
        const expectClassSkill = TrainedSkill;
        test('click train on a skill neither career-free nor specialization-free.', () => {
            const actor = createActor();
            const skillId = "brawl";
            const params = {
                action: "train",
                isCreation: false,
                isCareer: false,
                isSpecialization: false
            };
            const options = {};
            const skill = SkillFactory.build(actor, skillId, params, options);
            expect(skill).toBeInstanceOf(expectClassSkill);
        });
    });
});
