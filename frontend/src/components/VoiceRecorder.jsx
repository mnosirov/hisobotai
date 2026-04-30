import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const VoiceRecorder = ({ onRecordingComplete, isAnalyzing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (chunksRef.current.length > 0) {
          onRecordingComplete(audioBlob);
        }
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success("Ovoz yozilyapti...", { icon: '🎙️', duration: 2000 });
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Mikrofonga ruxsat berilmagan yoki xatolik yuz berdi.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col items-center space-y-2"
          >
            <div className="flex items-center space-x-3 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-mono font-bold text-sm">{formatTime(recordingTime)}</span>
            </div>
            {/* Visualizer Bars */}
            <div className="flex items-center justify-center space-x-1 h-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: [4, 16, 8, 12, 4],
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.5 + Math.random() * 0.5,
                    delay: i * 0.1 
                  }}
                  className="w-1 bg-red-500/40 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isAnalyzing}
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isRecording 
            ? 'bg-red-600 shadow-red-500/20 border-4 border-red-500/50' 
            : 'bg-indigo-600 shadow-indigo-500/20 border-4 border-indigo-500/30'
        } ${isAnalyzing ? 'opacity-50' : ''}`}
      >
        {isAnalyzing ? (
          <Loader2 className="text-white animate-spin" size={32} />
        ) : isRecording ? (
          <Square className="text-white fill-current" size={28} />
        ) : (
          <Mic className="text-white" size={32} />
        )}
      </motion.button>
    </div>
  );
};

export default VoiceRecorder;
