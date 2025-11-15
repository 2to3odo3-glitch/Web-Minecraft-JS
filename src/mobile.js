export class MobileControls {
  constructor(options) {
    this.root = options?.root ?? null;
    this.movePad = options?.movePad ?? null;
    this.moveThumb = options?.moveThumb ?? null;
    this.lookPad = options?.lookPad ?? null;
    this.onMove = options?.onMove ?? (() => {});
    this.onLook = options?.onLook ?? (() => {});
    this.onJump = options?.onJump ?? (() => {});
    this.onBreakStart = options?.onBreakStart ?? (() => {});
    this.onBreakEnd = options?.onBreakEnd ?? (() => {});
    this.onPlace = options?.onPlace ?? (() => {});
    this.onToggleTool = options?.onToggleTool ?? (() => {});
    this.onToggleMode = options?.onToggleMode ?? (() => {});
    this.moveIdentifier = null;
    this.lookIdentifier = null;
    this.isActive = false;
    this.moveVector = { x: 0, y: 0 };
    this.lastLookPosition = null;
    this.buttons = options?.buttons ?? {};

    this.#bindMovement();
    this.#bindLook();
    this.#bindButtons();
  }

  #bindMovement() {
    if (!this.movePad) return;
    const handleStart = (event) => {
      if (this.moveIdentifier !== null) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      this.moveIdentifier = touch.identifier;
      this.#updateMove(touch);
      event.preventDefault();
    };
    const handleMove = (event) => {
      if (this.moveIdentifier === null) return;
      const touch = Array.from(event.changedTouches ?? []).find(
        (t) => t.identifier === this.moveIdentifier
      );
      if (!touch) return;
      this.#updateMove(touch);
      event.preventDefault();
    };
    const handleEnd = (event) => {
      if (this.moveIdentifier === null) return;
      const ended = Array.from(event.changedTouches ?? []).some(
        (t) => t.identifier === this.moveIdentifier
      );
      if (!ended) return;
      this.moveIdentifier = null;
      this.moveVector = { x: 0, y: 0 };
      this.onMove({ ...this.moveVector });
      if (this.moveThumb) {
        this.moveThumb.style.transform = 'translate(0px, 0px)';
      }
      event.preventDefault();
    };
    this.movePad.addEventListener('touchstart', handleStart, { passive: false });
    this.movePad.addEventListener('touchmove', handleMove, { passive: false });
    this.movePad.addEventListener('touchend', handleEnd, { passive: false });
    this.movePad.addEventListener('touchcancel', handleEnd, { passive: false });
  }

  #updateMove(touch) {
    const rect = this.movePad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const radius = rect.width / 2;
    const clampedX = Math.max(-radius, Math.min(radius, dx));
    const clampedY = Math.max(-radius, Math.min(radius, dy));
    const normalizedX = clampedX / radius;
    const normalizedY = clampedY / radius;
    this.moveVector = { x: normalizedX, y: normalizedY };
    this.onMove({ ...this.moveVector });
    if (this.moveThumb) {
      this.moveThumb.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }
  }

  #bindLook() {
    if (!this.lookPad) return;
    const handleStart = (event) => {
      if (this.lookIdentifier !== null) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      this.lookIdentifier = touch.identifier;
      this.lastLookPosition = { x: touch.clientX, y: touch.clientY };
      event.preventDefault();
    };
    const handleMove = (event) => {
      if (this.lookIdentifier === null) return;
      const touch = Array.from(event.changedTouches ?? []).find(
        (t) => t.identifier === this.lookIdentifier
      );
      if (!touch) return;
      const deltaX = touch.clientX - (this.lastLookPosition?.x ?? touch.clientX);
      const deltaY = touch.clientY - (this.lastLookPosition?.y ?? touch.clientY);
      this.lastLookPosition = { x: touch.clientX, y: touch.clientY };
      this.onLook({ deltaX, deltaY });
      event.preventDefault();
    };
    const handleEnd = (event) => {
      if (this.lookIdentifier === null) return;
      const ended = Array.from(event.changedTouches ?? []).some(
        (t) => t.identifier === this.lookIdentifier
      );
      if (!ended) return;
      this.lookIdentifier = null;
      this.lastLookPosition = null;
      event.preventDefault();
    };
    this.lookPad.addEventListener('touchstart', handleStart, { passive: false });
    this.lookPad.addEventListener('touchmove', handleMove, { passive: false });
    this.lookPad.addEventListener('touchend', handleEnd, { passive: false });
    this.lookPad.addEventListener('touchcancel', handleEnd, { passive: false });
  }

  #bindButtons() {
    const {
      jumpButton,
      breakButton,
      placeButton,
      toolButton,
      modeButton,
    } = this.buttons;

    if (jumpButton) {
      const handler = (event) => {
        event.preventDefault();
        this.onJump();
      };
      jumpButton.addEventListener('touchstart', handler, { passive: false });
      jumpButton.addEventListener('click', handler);
    }

    if (breakButton) {
      const start = (event) => {
        event.preventDefault();
        this.onBreakStart();
      };
      const end = (event) => {
        event.preventDefault();
        this.onBreakEnd();
      };
      breakButton.addEventListener('touchstart', start, { passive: false });
      breakButton.addEventListener('touchend', end, { passive: false });
      breakButton.addEventListener('touchcancel', end, { passive: false });
      breakButton.addEventListener('mousedown', start);
      breakButton.addEventListener('mouseup', end);
      breakButton.addEventListener('mouseleave', end);
      breakButton.addEventListener('click', (event) => {
        event.preventDefault();
      });
    }

    if (placeButton) {
      const handler = (event) => {
        event.preventDefault();
        this.onPlace();
      };
      placeButton.addEventListener('touchstart', handler, { passive: false });
      placeButton.addEventListener('click', handler);
    }

    if (toolButton) {
      const handler = (event) => {
        event.preventDefault();
        this.onToggleTool();
      };
      toolButton.addEventListener('touchstart', handler, { passive: false });
      toolButton.addEventListener('click', handler);
    }

    if (modeButton) {
      const handler = (event) => {
        event.preventDefault();
        this.onToggleMode();
      };
      modeButton.addEventListener('touchstart', handler, { passive: false });
      modeButton.addEventListener('click', handler);
    }
  }

  enable() {
    this.isActive = true;
    this.root?.classList.remove('hidden');
    this.root?.classList.add('active');
    if (this.root) {
      this.root.setAttribute('aria-hidden', 'false');
    }
  }

  disable() {
    this.isActive = false;
    this.root?.classList.remove('active');
    this.root?.classList.add('hidden');
    if (this.root) {
      this.root.setAttribute('aria-hidden', 'true');
    }
    this.moveVector = { x: 0, y: 0 };
    if (this.moveThumb) {
      this.moveThumb.style.transform = 'translate(0px, 0px)';
    }
  }

  getMoveVector() {
    return { ...this.moveVector };
  }
}
