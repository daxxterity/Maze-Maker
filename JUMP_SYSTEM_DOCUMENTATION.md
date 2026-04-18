# Jump System Documentation & Code Analysis

This document isolates all functions and state variables that control the "Jump" mechanic in the application. It includes logic for movement calculation, collision handling, state management, and visual rendering.

## 1. Core State Definition (App.tsx)
The jump mechanic relies on these primary states to track what the player is doing and what boosts are active.

```typescript
// Located in src/App.tsx
// Tracks the current animation/physical state of the player.
// 'jump' is a transient state triggered by movement.
const [playerAction, setPlayerAction] = useState<'normal' | 'jump' | 'slide'>('normal');

// Derived from collecting the 'artefact-jumper' (Jumping Pole).
// This is a permanent unlock for the current life/session.
const [hasJumper, setHasJumper] = useState(false);

// Temporary boost time (e.g., from a power-up or special interaction).
// Decays over time in the main timer loop.
const [jumpBoostTime, setJumpBoostTime] = useState(0);
```

---

## 2. Movement Logic (src/hooks/usePlayerMovement.ts)
This is the "Brain" of the jump. It calculates how far the player moves and what they can ignore.

### A. Step Calculation
The jump distance is calculated based on active equipment and power-ups.

```typescript
// Logic inside movePlayer function
const isJumping = actionType === 'jump';

// Standard movement step (usually 1 or 2 if speed-boosted)
let step = Math.max(1, Math.floor(speedMultiplier * webMultiplier));

if (isJumping) {
  // If jumping, check if distance is doubled (5 tiles) or standard (3 tiles).
  // Doubled if the player has the Jumper Artefact, has it active, or has a boost timer.
  step = (hasJumper || (selectedArtefact === 'artefact-jumper' && isArtefactActive) || jumpBoostTime > 0) ? 5 : 3;
}
```

### B. Collision & Hazard Immunity
A crucial part of jumping is what the player is allowed to ignore.

```typescript
// Inside the step loop (for i = 0 to step)
for (let i = 0; i < step; i++) {
  // ... calculate nextX, nextY ...

  // 1. Monster Collision Exclusion
  const monsterAtNext = monsters.find(m => m.x === nextX && m.y === nextY);
  if (monsterAtNext && !isGameOver && !isJumping) {
    // Note the !isJumping above. If the player IS jumping, 
    // they bypass this collision logic entirely.
    // ... death logic ...
  }

  // 2. Solid Wall Check
  // Walls and fixed solid objects (Columns/Trees) ALWAYS block a jump.
  // The player cannot jump "through" a building or a forest boundary.
  if (blockedByWall || isSolidObstacle) {
    break; // Stop movement at the obstacle
  }

  // 3. Hazard Immunity (Lava, Water, Void, Spikes)
  const isBlockedByOther = nextTiles.some(t => {
    const isHazard = t.type === 'void' || t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit';
    
    if (isHazard && !isJumping) {
      // Hazards only stop/kill the player if they are NOT jumping.
      // This effectively allows the player to "sail over" these tiles.
      // ... death logic ...
      return true;
    }
    return false;
  });

  if (isBlockedByOther) break;

  // ... update final position ...
}
```

### C. State Restoration
After the physical movement is complete, the player remains in the 'jump' action for a short duration to allow animations/immunity to complete.

```typescript
setPlayerPos({ x: finalX, y: finalY, z: finalZ });
setPlayerAction(actionType); // Sets state to 'jump'

if (actionType === 'jump') {
  // Wait 400ms before returning to 'normal' state.
  // This duration controls the window of immunity and the visual "air time".
  setTimeout(() => setPlayerAction('normal'), 400); 
}
```

---

## 3. Input Handling (src/hooks/usePlayerMovement.ts)
The trigger mechanism that initiates the jump.

```typescript
// Inside handleKeyDown effect
if (e.key === ' ' && playerAction === 'normal') {
  // Spacebar triggers movePlayer with 'jump' action.
  // It uses the 'lastDirection' to determine where to leap.
  movePlayer(lastDirection.dx, lastDirection.dy, 'jump');
  return;
}
```

---

## 4. Visual Rendering (src/components/Game/GameView.tsx)
This controls how the player "looks" while jumping. If the environment "flickers," it may be because of how the global offsets interact with the player's local jumping transforms.

```typescript
// Inside GameView.tsx rendering loop
<Group 
  x={playerPos.x * gridSize + gridSize / 2} 
  y={playerPos.y * gridSize + gridSize / 2}
  // If playerAction is 'jump', we scale them up slightly (1.2x) 
  // and offset their Y position (-20px) to simulate being "in the air".
  scaleX={fallingProgress * (playerAction === 'slide' ? 1.4 : playerAction === 'jump' ? 1.2 : 1)}
  scaleY={fallingProgress * (playerAction === 'slide' ? 0.6 : playerAction === 'jump' ? 1.2 : 1)}
  offsetY={playerAction === 'jump' ? 20 : 0}
>
  {/* ... Player Sprite (Circle) ... */}
</Group>
```

---

## 5. Potential "Flicker" & Redrawing Issues (Analysis)
The user reported environment flickering or resetting. Here are technical factors identified during code review:

1.  **Stage "Snap" Tweening**: 
    When the camera is in `follow` mode, it uses `stageRef.current.to({...})` to center on the player (App.tsx line 1018). Since a jump moves the player **3-5 tiles instantly**, the `targetX`/`targetY` of the camera shifts by up to 320 pixels in one frame. The "flicker" is the visual result of the entire dungeon suddenly sliding or snapping to re-center.

2.  **Discrete vs. Continuous**:
    The jump is not a smooth continuous arc. It calculates the destination, moves the player's coordinate there, and then relies on a 400ms CSS/React `setTimeout` for the "visual state." This can cause a 1-frame "pop" where the player is at the destination but the "flight height" (offsetY) hasn't rendered yet.

3.  **Z-Axis Visibility**:
    In play mode, only tiles on the current Z-plane (and adjacent stairs) are rendered. If a jump carries a player over a hole or onto a different elevation, the entire set of visible tiles might replace itself in a single frame, contributing to the "reset" feeling.

4.  **State Synchronization**:
    The `playerAction` 'jump' state is what tells the renderer to lift the player. If there is even a tiny delay (one render cycle) between the `playerPos` update and the `playerAction` update, the player will appear at the destination "grounded" for one frame before "jumping" into the air, creating a jittery effect.

---

**Summary for AI Inspector:**
The jump is a **discrete coordinate shift** combined with a **transient visual transform**. It ignores hazards and monsters by checking `!isJumping` in the collision loops. The "Glitch" likely occurs in the hand-off between the physics engine (Coordinate update) and the visual engine (Konva Stage positioning).
