// skill-factory.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import SkillFactory from "../../../module/lib/skills/skill-factory.mjs";
import {createActor} from "../../utils/actors/actor.mjs";
import CareerFreeSkill from "../../../module/lib/skills/career-free-skill.mjs";
import SpecializationFreeSkill from "../../../module/lib/skills/specialization-free-skill.mjs";
import TrainedSkill from "../../../module/lib/skills/trained-skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";

describe("SkillFactory build()", () => {
    describe("during creation time", () => {
        describe("should create a CareerFreeSkill", () => {
            const expectClassSkill = CareerFreeSkill;
            describe("action is train", () => {
                const action = "train";
                test('click on a career-free skill only.', () => {
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
                test('click on a skill either career-free or specialization-free only and has a career-free skill point.', () => {
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
                test('click on a career-free skill and actor has career-free rank and some experience points to spend.', () => {
                    const actor = createActor();
                    actor.experiencePoints.spent = 10;
                    actor.experiencePoints.gained = 100;
                    actor.experiencePoints.available = 90;
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
                    actor.system.skills.brawl.rank.careerFree = 1;
                    actor.system.skills.brawl.rank.value = 1;

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
            });
        });
        describe("should create a SpecializationFreeSkill", () => {
            const expectClassSkill = SpecializationFreeSkill;
            describe("action is train", () => {
                const action = "train";
                test('click on a skill that is specialization-free and career-free with already a career-free on it.', () => {
                    const actor = createActor({careerSpent: 1});
                    actor.system.skills.brawl.rank.careerFree = 1;
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
                test('click on a skill either career-free or specialization-free only and has a specialization-free skill point.', () => {
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
                test('click on a skill either career-free or specialization-free only and has a both a career-free and a specialization-free skill point.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.specializationFree = 1;
                    actor.system.skills.brawl.rank.careerFree = 1;
                    actor.experiencePoints.spent = 10;
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
            const expectTrainedClassSkill = TrainedSkill;
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
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
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
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
                });
                test('click on a skill with trained points, actor has no free skill point and some experience points to spend.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.careerFree = 0;
                    actor.system.skills.brawl.rank.specializationFree = 0;
                    actor.system.skills.brawl.rank.trained = 1;
                    actor.experiencePoints.spent = 10;
                    actor.experiencePoints.gained = 100;
                    actor.experiencePoints.available = 90;
                    actor.freeSkillRanks = {
                        career: {
                            spent: 0,
                            gained: 4,
                            available: 0
                        },
                        specialization: {
                            spent: 0,
                            gained: 2,
                            available: 0
                        }
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
                });
                test('click on a career-free skill and actor has no career-free points left and some experience points to spend.', () => {
                    const actor = createActor();
                    actor.experiencePoints.spent = 10;
                    actor.experiencePoints.gained = 100;
                    actor.experiencePoints.available = 90;
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
                    actor.system.skills.brawl.rank.careerFree = 1;
                    actor.system.skills.brawl.rank.value = 1;

                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
                });
            });
            describe("action is forget", () => {
                const action = "forget";
                test('click on a skill with trained points, actor has no free skill point and some experience point spent.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.careerFree = 0;
                    actor.system.skills.brawl.rank.specializationFree = 0;
                    actor.system.skills.brawl.rank.trained = 1;
                    actor.experiencePoints.spent = 10;
                    actor.freeSkillRanks = {
                        career: {
                            spent: 0,
                            gained: 4,
                            available: 0
                        },
                        specialization: {
                            spent: 0,
                            gained: 2,
                            available: 0
                        }
                    }
                    const skillId = "brawl";
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: false
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
                });
                test('click on a skill with trained and career free skill points.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.careerFree = 1;
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
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
                })
                test('click on a skill with trained and specialization free skill points.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.careerFree = 0;
                    actor.system.skills.brawl.rank.specializationFree = 1;
                    actor.system.skills.brawl.rank.trained = 1;
                    actor.experiencePoints.spent = 10;
                    actor.freeSkillRanks = {
                        career: {
                            spent: 3,
                            gained: 4,
                            available: 1
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
                        isSpecialization: false
                    };
                    const options = {};
                    const skill = SkillFactory.build(actor, skillId, params, options);
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
                });
                test('click on a skill with trained, career and specialization free skill points.', () => {
                    const actor = createActor();
                    actor.system.skills.brawl.rank.careerFree = 1;
                    actor.system.skills.brawl.rank.specializationFree = 1;
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
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
                });
                test('click on a skill with trained points, actor has no free skill point and some experience point spent.', () => {
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
                    expect(skill).toBeInstanceOf(expectTrainedClassSkill);
                });
            });
        });
        describe("should create a ErrorSkill", () => {
            const expectClassSkill = ErrorSkill;
            describe("action is train", () => {
                const action = "train";
                test('click train on a skill that is neither career-free nor specialization-free and actor has career-free points', () => {
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
                test('click train on a skill that is neither career-free nor specialization-free and actor has specialization-free points', () => {
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
                test('click on a skill with trained points, actor has no free skill point and no experience point spent.', () => {
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
