import SwerpgTalentIcon from "./talent-icon.mjs";

export default class SwerpgTalentTreeNode extends SwerpgTalentIcon {
  constructor(node, config) {
    super(config);
    this.node = node;
    this.position.set(node.point.x, node.point.y);
  }

  static NODE_TYPES = {
    attack: "Attack",
    defense: "Defense",
    heal: "Healing",
    magic: "Spellcraft",
    move: "Movement",
    utility: "Utility",
    signature: "Signature"
  }

  /* -------------------------------------------- */

  /**
   * Is this node currently active?
   * @type {boolean}
   */
  get isActive() {
    return game.system.tree.active === this;
  }

  /* -------------------------------------------- */

  /** @override */
  async draw({state, ...config}={}) {
    const variety = state.purchased ? this.node.abilities.first() : "inactive";
    config.texture = getTexture(`systems/swerpg/ui/tree/nodes/${this.node.type}-${variety}.webp`);

    // Signature nodes
    if ( this.node.type === "signature" ) {
      config.size = 80;
      config.borderRadius = 80;
    }

    // Is the node accessible or not?
    if ( state.accessible ) {
      config.alpha = 0.4;
      config.borderColor = 0x827f7d;
      config.borderWidth = 2;
    } else {
      config.alpha = 0.1;
      config.borderColor = 0x262322;
      config.borderWidth = 2;
    }

    // Has the node been purchased?
    if ( state.purchased ) {
      config.alpha = 1.0;
      config.borderColor = this.node.color;
      config.borderWidth = 3;
    }

    // Has the node been banned?
    else if ( state.banned ) {
      config.borderColor = 0x330000;
    }

    // Draw Icon
    await super.draw(config);

    // Node interaction
    this.#activateInteraction();
  }

  /* -------------------------------------------- */

  /** @override */
  _getShape() {
    const size = this.config.size;
    const hs = size / 2;
    const borders = [[0, 0.5], [0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1]];

    // Signature nodes = Hexagon
    if ( this.node.type === "signature" ) {
      const width = size;
      const height = size * Math.sqrt(3) / 2;
      const points = borders.reduce((arr, [ox, oy]) => {
        arr.push((ox * width) - (width / 2));
        arr.push((oy * height) - (height / 2));
        return arr;
      }, []);
      return new PIXI.Polygon(points);
    }

    // Regular talent nodes = Circle
    return new PIXI.Circle(0, 0, hs);
  }

  /* -------------------------------------------- */

  #activateInteraction() {
    this.removeAllListeners();
    this.on("pointerover", this.#onPointerOver.bind(this));
    this.on("pointerout", this.#onPointerOut.bind(this));
    this.on("pointerdown", this.#onClickLeft.bind(this));
    this.eventMode = "static";
    this.cursor = "pointer";
  }

  /* -------------------------------------------- */

  #onClickLeft(event) {
    event.stopPropagation();
    if ( event.data.originalEvent.button !== 0 ) return; // Only support standard left-click
    const tree = game.system.tree;
    if ( this.isActive ) {
      tree.deactivateNode();
      this.#onPointerOut(event);
    }
    else {
      this.#onPointerOver(event);
      tree.activateNode(this);
    }
  }

  /* -------------------------------------------- */

  #onPointerOver(event) {
    const tree = game.system.tree;
    // TODO why are these safeguards necessary?
    if ( !tree.app.renderer.enabled ) return;
    if ( document.elementFromPoint(event.globalX, event.globalY)?.id !== "swerpg-talent-tree" ) return;
    tree.hud.activate(this);
    this.scale.set(1.2, 1.2);
  }

  /* -------------------------------------------- */

  #onPointerOut(event) {
    const tree = game.system.tree;
    // TODO why are these safeguards necessary?
    if ( !tree.app.renderer.enabled ) return;
    if ( document.elementFromPoint(event.globalX, event.globalY)?.id !== "swerpg-talent-tree" ) return;
    tree.hud.clear();
    if ( this.isActive ) return; // Don't un-hover an active node
    this.scale.set(1.0, 1.0);
  }
}

