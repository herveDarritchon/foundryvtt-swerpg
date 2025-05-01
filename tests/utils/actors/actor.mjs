/**
 * @returns {SwerpgActor} an actor object
 */
export function createActor(
    {
        careerSpent = 0,
        specializationSpent = 0,
    } = {}
) {
    return {
        freeSkillRanks: {
            "career": {
                "id": "",
                "name": "",
                "spent": careerSpent,
                "gained": 4,
                "available": 4
            },
            "specialization": {
                "id": "",
                "name": "",
                "spent": specializationSpent,
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
            },
            characteristics: {
                "brawn": {
                    "rank": {
                        "base": 1,
                        "trained": 0,
                        "bonus": 0,
                        "value": 1
                    }
                },
                "agility": {
                    "rank": {
                        "base": 1,
                        "trained": 0,
                        "bonus": 0,
                        "value": 2
                    }
                },
                "intellect": {
                    "rank": {
                        "base": 1,
                        "trained": 0,
                        "bonus": 0,
                        "value": 1
                    }
                },
                "cunning": {
                    "rank": {
                        "base": 1,
                        "trained": 0,
                        "bonus": 0,
                        "value": 1
                    }
                },
                "willpower": {
                    "rank": {
                        "base": 1,
                        "trained": 0,
                        "bonus": 0,
                        "value": 1
                    }
                },
                "presence": {
                    "rank": {
                        "base": 1,
                        "trained": 0,
                        "bonus": 0,
                        "value": 1
                    }
                }
            }
        }
    };
}

export function updateActor(actor, updates) {
    for (const [key, value] of Object.entries(updates)) {
        if (key in actor) {
            if (typeof value === 'object' && value !== null) {
                updateActor(actor[key], value);
            } else {
                actor[key] = value;
            }
        }
    }
}

