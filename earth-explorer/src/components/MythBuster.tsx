import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight, RefreshCw } from 'lucide-react';
import mythsData from '../data/mythBuster.json';
import './MythBuster.css';

interface Myth {
  id: string;
  statement: string;
  isFact: boolean;
  explanation: string;
  source: string;
}

export default function MythBuster() {
  const myths = mythsData as Myth[];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<null | boolean>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const current = myths[i];
  const correct = picked === null ? null : picked === current.isFact;
  const done = i >= myths.length;

  const score = useMemo(() => answers.filter(Boolean).length, [answers]);

  function pick(choice: boolean) {
    if (picked !== null) return;
    setPicked(choice);
    setAnswers([...answers, choice === current.isFact]);
  }

  function next() {
    setI(i + 1);
    setPicked(null);
  }

  function restart() {
    setI(0);
    setPicked(null);
    setAnswers([]);
  }

  if (done) {
    return (
      <div className="myth-wrap">
        <div className="myth-kicker">MYTH BUSTER · COMPLETE</div>
        <div className="myth-final">
          <h2>{score} / {myths.length} busted correctly</h2>
          <p>{score >= 8 ? 'You know your planet.' : score >= 5 ? 'Solid awareness. Keep probing.' : 'Myths persist. Dig deeper.'}</p>
          <button className="myth-restart" onClick={restart}><RefreshCw size={14} /> PLAY AGAIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="myth-wrap">
      <div className="myth-head">
        <div className="myth-kicker">MYTH BUSTER · CASE {String(i + 1).padStart(2, '0')} / {String(myths.length).padStart(2, '0')}</div>
        <div className="myth-progress">
          {myths.map((_, idx) => (
            <span
              key={idx}
              className={`myth-dot ${idx < answers.length ? (answers[idx] ? 'ok' : 'bad') : ''} ${idx === i ? 'cur' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="myth-card-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + (picked === null ? 'front' : 'back')}
            initial={{ rotateY: picked === null ? 90 : -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: picked === null ? -90 : 90, opacity: 0 }}
            transition={{ duration: 0.45 }}
            className={`myth-card ${picked !== null ? (correct ? 'is-right' : 'is-wrong') : ''}`}
          >
            {picked === null ? (
              <>
                <div className="myth-side">SIDE A · CLAIM</div>
                <blockquote className="myth-claim">"{current.statement}"</blockquote>
                <div className="myth-prompt">Fact or myth?</div>
              </>
            ) : (
              <>
                <div className="myth-side">SIDE B · VERDICT</div>
                <div className={`myth-verdict ${correct ? 'ok' : 'bad'}`}>
                  {correct ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                  {correct ? 'You were right.' : 'Busted.'}
                </div>
                <div className="myth-reveal">
                  This is a <strong>{current.isFact ? 'FACT' : 'MYTH'}</strong>.
                </div>
                <p className="myth-explanation">{current.explanation}</p>
                <div className="myth-source">Source · {current.source}</div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {picked === null ? (
        <div className="myth-choices">
          <button className="myth-choice myth-myth" onClick={() => pick(false)}>FALSE / MYTH</button>
          <button className="myth-choice myth-fact" onClick={() => pick(true)}>TRUE / FACT</button>
        </div>
      ) : (
        <button className="myth-next" onClick={next}>
          NEXT MYTH <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
