import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import "./AceMascot.css";

// The six states the rig knows how to play.
// "greeting" and "success" are one-shot: they play once, then this
// component quietly switches itself back to "idle" on its own.
var VALID_STATES = ["idle", "greeting", "listening", "thinking", "success", "error"];
var ONE_SHOT_DURATIONS = { greeting: 1300, success: 1300 };

// Two ways to drive this component:
//
// 1) The `state` prop — fine for sustained states that naturally change
//    value each time (idle <-> listening <-> thinking <-> error).
//
// 2) A ref with `.play("success")` — use this for one-shot states you
//    might trigger with the SAME value back to back (e.g. two replies in
//    a row both calling .play("success")). React quietly ignores a state
//    update that repeats the current value, which would otherwise make
//    the second celebration silently not play. The ref method sidesteps
//    that by always forcing a fresh restart, so every call actually
//    plays the animation — while a genuine state CHANGE (idle->thinking,
//    thinking->success, etc.) still eases smoothly via the CSS
//    transition rules instead of snapping through a reset frame.
var AceMascot = forwardRef(function AceMascot(props, ref) {
  var requestedState = props.state || "idle";
  var onOneShotComplete = props.onOneShotComplete;
  var className = props.className || "";

  if (VALID_STATES.indexOf(requestedState) === -1) {
    requestedState = "idle";
  }

  var stateHook = useState(requestedState);
  var playingState = stateHook[0];
  var setPlayingState = stateHook[1];
  var timerRef = useRef(null);
  var rafRef = useRef(null);
  var playingRef = useRef(playingState);
  playingRef.current = playingState;

  function applyState(nextState) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    function armAutoRevert() {
      var duration = ONE_SHOT_DURATIONS[nextState];
      if (duration) {
        timerRef.current = setTimeout(function () {
          setPlayingState("idle");
          if (onOneShotComplete) {
            onOneShotComplete(nextState);
          }
        }, duration);
      }
    }

    if (playingRef.current === nextState) {
      // Re-triggering the exact same state: clear for one frame first so
      // the CSS animation restarts from frame zero instead of quietly
      // no-oping (this only affects a repeat of the SAME value — a real
      // transition to a different state always goes straight through,
      // below, so it keeps easing rather than flashing to neutral).
      setPlayingState(null);
      rafRef.current = requestAnimationFrame(function () {
        setPlayingState(nextState);
        armAutoRevert();
      });
    } else {
      setPlayingState(nextState);
      armAutoRevert();
    }
  }

  useEffect(function () {
    applyState(requestedState);
    return function () {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedState]);

  useImperativeHandle(ref, function () {
    return {
      play: function (s) {
        if (VALID_STATES.indexOf(s) !== -1) {
          applyState(s);
        }
      },
    };
  });

  var wrapperClass = ["ace-mascot", className].join(" ").trim();

  return (
    <div className={wrapperClass} data-state={playingState || undefined}>
      <svg
        className="ace-rig"
        viewBox="0 0 640 560"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Ace, the i-PESO assistant"
      >
        <defs>
          <radialGradient id="aceBodyGrad" cx="32%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#7FA6FF" />
            <stop offset="45%" stopColor="#2F6FED" />
            <stop offset="100%" stopColor="#153C9E" />
          </radialGradient>
          <radialGradient id="aceYellowGrad" cx="35%" cy="28%" r="82%">
            <stop offset="0%" stopColor="#FFF1C7" />
            <stop offset="45%" stopColor="#FFC93C" />
            <stop offset="100%" stopColor="#E08F00" />
          </radialGradient>
          <radialGradient id="aceEyeGrad" cx="35%" cy="26%" r="88%">
            <stop offset="0%" stopColor="#374A88" />
            <stop offset="55%" stopColor="#122148" />
            <stop offset="100%" stopColor="#060D22" />
          </radialGradient>
          <linearGradient id="acePanelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E3EDFC" />
          </linearGradient>
          <filter id="aceSoftBlur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <g id="rig-float">
          {/* ground shadow */}
          <g id="shadow" style={{ transformOrigin: "320px 480px" }}>
            <ellipse cx="320" cy="480" rx="132" ry="18" fill="#0A1530" opacity="0.14" filter="url(#aceSoftBlur)" />
            <ellipse cx="320" cy="474" rx="66" ry="10" fill="#0A1530" opacity="0.20" filter="url(#aceSoftBlur)" />
          </g>

          <ellipse cx="320" cy="290" rx="180" ry="160" fill="url(#aceBodyGrad)" opacity="0.08" filter="url(#aceSoftBlur)" />

          {/* left arm — drawn in neutral (unrotated) space; CSS rotate()
              around the shoulder pivot puts it in its final pose. Keeping
              the glove at the tube's own unrotated tip is what keeps hand
              and arm attached at every rotation angle. */}
          <g id="armL">
            <rect x="83" y="285" width="85" height="30" rx="15" fill="url(#aceBodyGrad)" />
            <circle cx="83" cy="300" r="22" fill="url(#aceYellowGrad)" />
          </g>

          {/* right arm — same neutral-space rule */}
          <g id="armR">
            <rect x="467" y="288" width="90" height="30" rx="15" fill="url(#aceBodyGrad)" />
            <circle cx="557" cy="303" r="22" fill="url(#aceYellowGrad)" />
            <g id="waveArcs">
              <path d="M579 288 Q592 303 579 318" stroke="#FFC93C" strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round" />
              <path d="M591 294 Q601 303 591 312" stroke="#FFC93C" strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
            </g>
          </g>

          {/* body */}
          <circle id="body-fill" cx="320" cy="290" r="155" fill="url(#aceBodyGrad)" />
          <ellipse cx="267" cy="234" rx="48" ry="30" fill="#FFFFFF" opacity="0.38" filter="url(#aceSoftBlur)" transform="rotate(-18 267 234)" />

          {/* chest button */}
          <circle cx="320" cy="400" r="22" fill="url(#aceBodyGrad)" />
          <circle cx="320" cy="400" r="8" fill="url(#aceYellowGrad)" />

          {/* antenna */}
          <g id="antennaGrp">
            <rect x="317" y="90" width="6" height="48" rx="3" fill="url(#aceBodyGrad)" />
            <circle className="ball" cx="320" cy="82" r="14" fill="url(#aceYellowGrad)" />
          </g>

          {/* thought dots (thinking) */}
          <g id="thoughtDots">
            <circle className="d1" cx="300" cy="58" r="5" fill="#FFC93C" />
            <circle className="d2" cx="320" cy="48" r="5" fill="#FFC93C" />
            <circle className="d3" cx="340" cy="58" r="5" fill="#FFC93C" />
          </g>

          {/* sparkles (success) */}
          <g id="sparkles">
            <path className="s1" d="M232 150 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4 z" fill="#FFC93C" />
            <path className="s2" d="M408 150 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4 z" fill="#FFC93C" />
            <path className="s3" d="M200 260 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 z" fill="#2F6FED" />
            <path className="s4" d="M440 260 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 z" fill="#2F6FED" />
          </g>

          {/* face panel */}
          <g id="panelGrp">
            <rect x="214" y="211" width="220" height="150" rx="42" fill="#0A1530" opacity="0.16" filter="url(#aceSoftBlur)" />
            <rect x="210" y="205" width="220" height="150" rx="42" fill="url(#acePanelGrad)" />
            <rect x="210" y="205" width="220" height="150" rx="42" fill="none" stroke="#1D4ED8" strokeWidth="2.5" opacity="0.12" />

            <circle id="blushL" cx="228" cy="300" r="11" fill="#FFEDBB" opacity="0.85" />
            <circle id="blushR" cx="412" cy="300" r="11" fill="#FFEDBB" opacity="0.85" />

            <g id="eyeL">
              <ellipse cx="270" cy="270" rx="26" ry="32" fill="url(#aceEyeGrad)" />
              <circle cx="262" cy="258" r="7" fill="#FFFFFF" />
            </g>
            <g id="eyeR">
              <ellipse cx="370" cy="270" rx="26" ry="32" fill="url(#aceEyeGrad)" />
              <circle cx="362" cy="258" r="7" fill="#FFFFFF" />
            </g>

            {/* sound arcs (listening) */}
            <g id="soundArcs">
              <path className="arc1" d="M398 258 Q414 270 398 282" stroke="#2F6FED" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path className="arc2" d="M410 250 Q432 270 410 290" stroke="#2F6FED" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.55" />
            </g>

            <g id="mouthGrp">
              <path className="mouth-smile" d="M295 318 Q320 336 345 318" stroke="#122148" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path className="mouth-flat" d="M298 322 L342 322" stroke="#122148" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path className="mouth-grin" d="M288 312 Q320 348 352 312 Q320 334 288 312 Z" fill="#122148" />
              <path className="mouth-concern" d="M298 326 Q320 316 342 326" stroke="#122148" strokeWidth="6" fill="none" strokeLinecap="round" />
              <ellipse className="mouth-listen" cx="320" cy="321" rx="10" ry="7" fill="#122148" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
});

export default AceMascot;
