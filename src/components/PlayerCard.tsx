import React, { useState } from 'react';
import type { Player } from '../models/types';
import { CommanderDamage } from './CommanderDamage';
import { useContinuousHold } from '../hooks/useContinuousHold';
import { useCardOrientation } from '../hooks/useCardOrientation';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  opponents: Player[];
  onLifeChange: (amount: number) => void;
  onLifeExact: (amount: number) => void;
  onPoisonChange: (amount: number) => void;
  onCommanderDamageChange: (opponentId: string, amount: number) => void;
  colorClass: string;
  flipVertical: boolean;
  flipHorizontal: boolean;
  forceRotation?: number;
  layoutVariant?: 'default' | 'head-to-head';
  isAdvancedMode?: boolean;
  onSearchCommander?: () => void;
  onUpdateName?: (newName: string) => void;
  onConfirmDeath?: (cause: 'life' | 'poison' | 'commander-damage' | 'conceded' | 'mill' | 'alt-win-con') => void;
  onRevive?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  opponents,
  onLifeChange,
  onLifeExact,
  onPoisonChange,
  onCommanderDamageChange,
  colorClass,
  flipVertical,
  flipHorizontal,
  forceRotation,
  layoutVariant = 'default',
  isAdvancedMode = false,
  onSearchCommander,
  onConfirmDeath,
  onRevive,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const justRevivedRef = React.useRef(false);
  const { width, height, isLandscape } = useCardOrientation(containerRef);
  // Delta tracking for long press visual feedback
  const [lifeDelta, setLifeDelta] = useState(0);
  const [showDelta, setShowDelta] = useState(false);
  const [trackerDelta, setTrackerDelta] = useState(0);
  const [trackerDeltaLabel, setTrackerDeltaLabel] = useState<string | null>(null);
  const [trackerDeltaSource, setTrackerDeltaSource] = useState<string | null>(null);

  const handleTrackerDelta = (delta: number, label: string, sourceId: string) => {
    if (delta !== 0) {
      setTrackerDelta(delta);
      setTrackerDeltaLabel(label);
      setTrackerDeltaSource(sourceId);
    } else if (sourceId === trackerDeltaSource) {
      setTrackerDelta(0);
      setTrackerDeltaLabel(null);
      setTrackerDeltaSource(null);
    }
  };
  const [isEditingLife, setIsEditingLife] = useState(false);
  const [exactLifeInput, setExactLifeInput] = useState(player.life.toString());

  const [pendingDeathCause, setPendingDeathCause] = useState<'life' | 'poison' | 'commander-damage' | 'conceded' | 'mill' | 'alt-win-con' | null>(null);
  const [showDeathConfirm, setShowDeathConfirm] = useState(false);
  const [showManualDeathPopup, setShowManualDeathPopup] = useState(false);

  // Wrap the exact setter handle
  const handleLifeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(exactLifeInput, 10);
    if (!isNaN(val)) {
      onLifeExact(val);
    }
    setIsEditingLife(false);
  };

  // Create handlers that also update the visual delta
  const handleAddLife = () => {
    onLifeChange(1);
    setLifeDelta(prev => prev + 1);
    setShowDelta(true);
  };

  const handleSubLife = () => {
    onLifeChange(-1);
    setLifeDelta(prev => prev - 1);
    setShowDelta(true);
  };

  const addHold = useContinuousHold(handleAddLife, 400, 100);
  const subHold = useContinuousHold(handleSubLife, 400, 100);

  // Clear delta when we stop pressing
  React.useEffect(() => {
    if (!addHold.isPressing && !subHold.isPressing && showDelta) {
      const timer = setTimeout(() => {
        setShowDelta(false);
        setLifeDelta(0);
      }, 1000); // Hide delta 1s after letting go
      return () => clearTimeout(timer);
    }
  }, [addHold.isPressing, subHold.isPressing, showDelta]);

  // Hook specifically for long pressing the life total to open numpad
  // We use a custom hook instance for this specific action
  const lifeTotalHold = useContinuousHold(() => {
    setExactLifeInput(player.life.toString());
    setIsEditingLife(true);
  }, 600, 999999, false); // Huge interval, strictly fires ONLY after 600ms hold

  // Lethal Detection Logic
  // Detect lethal conditions and show confirmation after a short delay
  React.useEffect(() => {
    // Only detect if not already dead
    if (player.deathStatus || justRevivedRef.current) return;

    let cause: 'life' | 'poison' | 'commander-damage' | 'conceded' | null = null;
    if (player.life <= 0) cause = 'life';
    else if (player.poison >= 10) cause = 'poison';
    else if (Object.values(player.commanderDamage).some(dmg => dmg >= 21)) cause = 'commander-damage';

    if (cause) {
      setPendingDeathCause(cause);
      const timer = setTimeout(() => {
        setShowDeathConfirm(true);
      }, 1000); // 1s debounce for lethal detection
      return () => clearTimeout(timer);
    } else {
      setShowDeathConfirm(false);
      setPendingDeathCause(null);
    }
  }, [player.life, player.poison, player.commanderDamage, player.deathStatus]);

  // Reset justRevivedRef when values change (meaning a manual change was made)
  React.useEffect(() => {
    if (justRevivedRef.current) {
      justRevivedRef.current = false;
    }
  }, [player.life, player.poison, player.commanderDamage]);

  const handleConfirmDeath = () => {
    if (pendingDeathCause && onConfirmDeath) {
      onConfirmDeath(pendingDeathCause);
    }
    setShowDeathConfirm(false);
  };

  const bannerHold = useContinuousHold(() => {
    if (player.deathStatus && onRevive) {
      justRevivedRef.current = true;
      onRevive();
    }
  }, 1000, 999999, false);

  const tagHold = useContinuousHold(() => {
    if (player.commander && onSearchCommander) {
      onSearchCommander();
    }
  }, 600, 999999, false);

  // Intercept the pointerDown event to ensure it doesn't inadvertently trigger the +/- buttons under the ring in some browsers
  const handleRingPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (lifeTotalHold.handlers.onPointerDown) {
      lifeTotalHold.handlers.onPointerDown(e);
    }
  };

  // Calculate rotation and absolute structural styling
  let rotation = 0;
  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s ease',
    zIndex: isEditingLife ? 110 : 1,
    pointerEvents: isEditingLife ? 'none' : 'auto',
  };

  if (forceRotation !== undefined) {
    rotation = forceRotation;
    if (rotation === 90 || rotation === -90) {
      contentStyle.width = `${height}px`;
      contentStyle.height = `${width}px`;
    } else {
      contentStyle.width = '100%';
      contentStyle.height = '100%';
    }
    contentStyle.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  } else if (isLandscape) {
    rotation = flipVertical ? 180 : 0;
    contentStyle.width = '100%';
    contentStyle.height = '100%';
    contentStyle.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  } else if (width > 0 && height > 0) {
    rotation = flipHorizontal ? -90 : 90;
    contentStyle.width = `${height}px`;
    contentStyle.height = `${width}px`;
    contentStyle.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  }

  const isH2H = layoutVariant === 'head-to-head' && opponents.length === 3;
  const isLeftAligned = player.id === 'player-1' || player.id === 'player-4';
  
  // Players A and B in 3-player layout act exactly like they do in 2x2
  const is3PlayerCorner = opponents.length === 2 && (player.id === 'player-1' || player.id === 'player-2');
  const is3PlayerCenter = opponents.length === 2 && player.id === 'player-3';
  
  const isUseCornerGrid = (layoutVariant === 'default' && opponents.length === 3) || is3PlayerCorner;

  const grid2x2PosClass = isLeftAligned ? 'cmd-pos-left' : 'cmd-pos-right';
  const lifeShiftClass = isUseCornerGrid ? (isLeftAligned ? 'arena-shift-right' : 'arena-shift-left') : '';

  const cardBackgroundStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 0,
  };
  
  if (isAdvancedMode && player.commander?.artCrop) {
    cardBackgroundStyle.backgroundImage = `url(${player.commander.artCrop})`;
    cardBackgroundStyle.backgroundSize = 'cover';
    cardBackgroundStyle.backgroundPosition = 'center';
  }

  const borderStyle: React.CSSProperties = {};
  if (isAdvancedMode && player.commander?.colorIdentity && player.commander.colorIdentity.length > 0) {  
    // Dynamic border color based on identity
    if (player.commander.colorIdentity.length > 0) {
      const colorMap: Record<string, string> = {
        'W': '#f9fafb', 'U': '#3182ce', 'B': '#1a202c', 'R': '#e53e3e', 'G': '#38a169'
      };
      const primaryColor = colorMap[player.commander.colorIdentity[0]];
      borderStyle.borderColor = primaryColor;
      borderStyle.boxShadow = `inset 0 0 40px rgba(0,0,0,0.6), 0 0 15px ${primaryColor}44`;
    }
  }

  return (
    <div 
      className={`player-card-container ${colorClass} ${isAdvancedMode ? 'advanced-mode' : ''} ${player.deathStatus ? 'is-defeated' : ''}`} 
      ref={containerRef}
      style={borderStyle}
    >
      
      {/* Invisible Full-Card Intercept Overlay: Active ONLY when Numpad is Open */}
      {isEditingLife && (
        <div 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, pointerEvents: 'auto' }} 
          onPointerDown={() => setIsEditingLife(false)} 
        />
      )}

      {/* Rotated Internal Frame */}
      <div style={contentStyle}>
        {/* Background Image inside rotated frame ensures correct orientation */}
        <div style={cardBackgroundStyle} className="card-art-bg" />
        
        <div className={`life-tracker-arena ${lifeShiftClass}`}>
        <button 
          className="life-btn giant-sub" 
          {...subHold.handlers}
          disabled={isEditingLife || showManualDeathPopup || showDeathConfirm}
          style={{ pointerEvents: (isEditingLife || showManualDeathPopup || showDeathConfirm) ? 'none' : 'auto' }}
        >
        </button>
        
        <div className={`center-info-container ${isEditingLife ? 'is-editing' : ''}`} style={{ pointerEvents: 'auto' }}>
          {!isUseCornerGrid && showDelta && lifeDelta !== 0 && (
            <div className={`life-delta ${lifeDelta > 0 ? 'positive' : 'negative'}`}>
              {lifeDelta > 0 ? '+' : ''}{lifeDelta}
            </div>
          )}
          {!isUseCornerGrid && trackerDelta !== 0 && (
            <div className={`life-delta tracker-delta ${trackerDelta > 0 ? 'positive' : 'negative'}`}>
              <div className="delta-label">{trackerDeltaLabel}</div>
              {trackerDelta > 0 ? '+' : ''}{trackerDelta}
            </div>
          )}

          <div className="life-display-wrapper">
            <div 
              className="life-ring" 
              {...lifeTotalHold.handlers} 
              onPointerDown={handleRingPointerDown}
            />
            {isEditingLife ? (
              <form 
                className="life-form" 
                onSubmit={handleLifeSubmit}
                onClick={(e) => e.stopPropagation()} // Prevent ring from capturing clicks on input
              >
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="life-input"
                  value={exactLifeInput}
                  onChange={(e) => setExactLifeInput(e.target.value)}
                  autoFocus
                />
                <div className="numpad-actions" style={{ pointerEvents: 'auto' }}>
                  <button type="button" className="declare-dead-btn" onClick={(e) => { e.stopPropagation(); setShowManualDeathPopup(true); }}>
                    DECLARE DEAD
                  </button>
                </div>
              </form>
            ) : (
              <div 
                className={`life-total ${player.life <= 0 ? 'dead' : ''}`}
              >
                {player.life}
              </div>
            )}
            {isAdvancedMode && !isH2H && (
              <div 
                className={`commander-name-tag ${player.commander ? 'has-commander' : ''}`} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!player.commander) onSearchCommander?.(); 
                }}
                style={{ pointerEvents: (isEditingLife || showManualDeathPopup || showDeathConfirm) ? 'none' : 'auto' }}
                {...(player.commander ? tagHold.handlers : {})}
              >
                {player.commander ? (
                  <>
                    <span className="tag-player-name">{player.name}</span>
                    <span className="tag-divider">|</span>
                    <span className="tag-commander-name">{player.commander.name}</span>
                  </>
                ) : (
                  'take a seat'
                )}
              </div>
            )}
          </div>
        </div>

        <button 
          className="life-btn giant-add" 
          {...addHold.handlers}
          disabled={isEditingLife || showManualDeathPopup || showDeathConfirm}
          style={{ pointerEvents: (isEditingLife || showManualDeathPopup || showDeathConfirm) ? 'none' : 'auto' }}
        >
        </button>
      </div>

      {isAdvancedMode && isH2H && (
        <div 
          className={`commander-name-tag tag-h2h ${player.commander ? 'has-commander' : ''}`} 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (!player.commander) onSearchCommander?.(); 
          }}
          {...(player.commander ? tagHold.handlers : {})}
        >
          {player.commander ? (
            <>
              <span className="tag-player-name">{player.name}</span>
              <span className="tag-divider">|</span>
              <span className="tag-commander-name">{player.commander.name}</span>
            </>
          ) : (
            'take a seat'
          )}
        </div>
      )}


      {player.deathStatus && (
        <div className="death-banner" {...bannerHold.handlers}>
          <div className="death-title">DEFEATED</div>
          <div className="death-reason">{player.deathStatus.cause === 'life' ? 'loss of life' : player.deathStatus.cause?.replace('-', ' ')}</div>
        </div>
      )}

      {opponents.length > 0 && (
        <div className={isUseCornerGrid ? 'absolute-row' : 'commander-damage-row'}>
          {isUseCornerGrid && (
            <div className={`delta-2x2-container ${grid2x2PosClass}`}>
              {trackerDelta !== 0 && (
                <div className={`life-delta life-delta-2x2 tracker-delta ${trackerDelta > 0 ? 'positive' : 'negative'}`}>
                  <div className="delta-label">{trackerDeltaLabel}</div>
                  {trackerDelta > 0 ? '+' : ''}{trackerDelta}
                </div>
              )}
              {showDelta && lifeDelta !== 0 && (
                <div className={`life-delta life-delta-2x2 ${lifeDelta > 0 ? 'positive' : 'negative'}`}>
                  {lifeDelta > 0 ? '+' : ''}{lifeDelta}
                </div>
              )}
            </div>
          )}
          <div className={isH2H ? "cmd-dpad" : is3PlayerCenter ? "cmd-dpad cmd-3player-center" : isUseCornerGrid ? `cmd-2x2-grid ${grid2x2PosClass}` : "cmd-list-horizontal"}>
            {/* Poison Tracker First */}
            <CommanderDamage
              opponentId="poison"
              opponentName="P"
              damageAmount={player.poison || 0}
              onAdd={() => onPoisonChange(1)}
              onSub={() => onPoisonChange(-1)}
              colorClass="color-fill-poison"
              onDeltaChange={handleTrackerDelta}
              lethalThreshold={10}
              wrapperClass={isH2H || is3PlayerCenter ? "dpad-center" : isUseCornerGrid ? (isLeftAligned ? "grid-bl" : "grid-br") : ""}
              isAdvancedMode={isAdvancedMode}
              disabled={showManualDeathPopup || showDeathConfirm}
            />
            {opponents.map((opp) => {
              let posClass = "";
              if (isH2H) {
                if (player.id === 'player-1') {
                  if (opp.id === 'player-4') posClass = 'dpad-up';
                  else if (opp.id === 'player-3') posClass = 'dpad-left';
                  else if (opp.id === 'player-2') posClass = 'dpad-right';
                } else if (player.id === 'player-2') {
                  if (opp.id === 'player-3') posClass = 'dpad-up';
                  else if (opp.id === 'player-1') posClass = 'dpad-left';
                  else if (opp.id === 'player-4') posClass = 'dpad-right';
                } else if (player.id === 'player-3') {
                  if (opp.id === 'player-2') posClass = 'dpad-up';
                  else if (opp.id === 'player-4') posClass = 'dpad-left';
                  else if (opp.id === 'player-1') posClass = 'dpad-right';
                } else if (player.id === 'player-4') {
                  if (opp.id === 'player-1') posClass = 'dpad-up';
                  else if (opp.id === 'player-2') posClass = 'dpad-left';
                  else if (opp.id === 'player-3') posClass = 'dpad-right';
                }
              } else if (isUseCornerGrid) {
                if (player.id === 'player-1') {
                  if (opp.id === 'player-2') posClass = 'grid-tl';
                  else if (opp.id === 'player-4') posClass = 'grid-tr';
                  else if (opp.id === 'player-3') posClass = 'grid-br';
                } else if (player.id === 'player-2') {
                  if (opp.id === 'player-1') posClass = 'grid-tr';
                  else if (opp.id === 'player-4') posClass = 'grid-bl';
                  else if (opp.id === 'player-3') posClass = opponents.length === 2 ? 'grid-bl' : 'grid-tl';
                } else if (player.id === 'player-3') {
                  if (opp.id === 'player-4') posClass = 'grid-tr';
                  else if (opp.id === 'player-2') posClass = 'grid-tl';
                  else if (opp.id === 'player-1') posClass = 'grid-bl';
                } else if (player.id === 'player-4') {
                  if (opp.id === 'player-3') posClass = 'grid-tl';
                  else if (opp.id === 'player-1') posClass = 'grid-tr';
                  else if (opp.id === 'player-2') posClass = 'grid-br';
                }
              } else if (is3PlayerCenter && player.id === 'player-3') {
                if (opp.id === 'player-1') posClass = 'dpad-left';
                else if (opp.id === 'player-2') posClass = 'dpad-right';
              }

              return (
                <CommanderDamage
                  key={opp.id}
                  opponentId={opp.id}
                  opponentName={opp.name}
                  damageAmount={player.commanderDamage[opp.id] || 0}
                  onAdd={() => onCommanderDamageChange(opp.id, 1)}
                  onSub={() => onCommanderDamageChange(opp.id, -1)}
                  colorClass={`color-fill-${opp.id.split('-')[1]}`} 
                  onDeltaChange={handleTrackerDelta}
                  wrapperClass={posClass}
                  commander={isAdvancedMode ? opp.commander : undefined}
                  isAdvancedMode={isAdvancedMode}
                  disabled={showManualDeathPopup || showDeathConfirm}
                />
              )
            })}
          </div>
        </div>
      )}
      {showDeathConfirm && !player.deathStatus && (
        <div className="death-confirm-overlay">
          <div className="death-confirm-card">
            <h3>Player Defeated?</h3>
            <p>Reason: {pendingDeathCause?.replace('-', ' ')}</p>
            <div className="death-confirm-btns">
              <button className="confirm-btn" onClick={handleConfirmDeath}>CONFIRM</button>
              <button className="cancel-btn" onClick={() => setShowDeathConfirm(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {showManualDeathPopup && (
        <div className="death-confirm-overlay" onClick={() => setShowManualDeathPopup(false)}>
          <div className="death-confirm-card compact-death-card" onClick={(e) => e.stopPropagation()}>
            <div className="manual-death-grid">
               <button className="death-option-btn" onClick={() => { onConfirmDeath?.('mill'); setShowManualDeathPopup(false); setIsEditingLife(false); }}>MILL</button>
               <button className="death-option-btn" onClick={() => { onConfirmDeath?.('alt-win-con'); setShowManualDeathPopup(false); setIsEditingLife(false); }}>ALT WIN CON</button>
               <button className="death-option-btn" onClick={() => { onConfirmDeath?.('conceded'); setShowManualDeathPopup(false); setIsEditingLife(false); }}>CONCEDED</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
