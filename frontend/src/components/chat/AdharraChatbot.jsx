import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Sparkles, X, Send, Trash2, MessageSquare, Clock, Cpu, 
  HelpCircle, AlertCircle, FileText, ChevronRight 
} from 'lucide-react';
import { sendChatMessage } from '../../services/chatService';
import { productService } from '../../services/productService';
import { useTheme } from '../../context/ThemeContext';

const QUICK_CHIPS = [
  { text: 'Products needing review', query: 'Show products pending review' },
  { text: 'Show data issues', query: 'Show data issues' },
  { text: 'Explain AI results', query: 'Explain AI results' }
];

export default function AdharraChatbot() {
  const { resolvedTheme, accentMode } = useTheme();
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Determine if the main application theme is dark
  const isAppDark = resolvedTheme !== 'light';

  // Chatbot uses the opposite visual theme
  const chatbotTheme = isAppDark ? 'light' : 'dark';

  // Chatbot Theme Color Scheme Variables
  const cbBg = chatbotTheme === 'dark' ? '#090C11' : '#FFFFFF';
  const cbSurface = chatbotTheme === 'dark' ? '#11151C' : '#F8FAFC';
  const cbSurfaceSec = chatbotTheme === 'dark' ? '#171C24' : '#F1F5F9';
  const cbTextPrimary = chatbotTheme === 'dark' ? '#F8FAFC' : '#111827';
  const cbTextSecondary = chatbotTheme === 'dark' ? '#AAB4C3' : '#475569';
  const cbTextMuted = chatbotTheme === 'dark' ? '#7B8798' : '#64748B';
  const cbBorder = chatbotTheme === 'dark' ? '#252D39' : '#D8E0EA';
  const cbInputBg = chatbotTheme === 'dark' ? '#151A22' : '#FFFFFF';

  // Contrast text color for User message bubbles
  const userMsgText = accentMode === 'amber' ? '#111827' : '#FFFFFF';

  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [errorState, setErrorState] = useState(false);
  
  // Product details context from localStorage
  const [activeProductId, setActiveProductId] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);

  const messageEndRef = useRef(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('adharra_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('adharra_chat_history');
      }
    }
  }, []);

  // Persist chat history on changes
  const saveMessages = (newMsgs) => {
    setMessages(newMsgs);
    try {
      localStorage.setItem('adharra_chat_history', JSON.stringify(newMsgs));
    } catch (e) {}
  };

  // Sync active product context on location change & custom events
  const syncProductContext = () => {
    const prodId = localStorage.getItem('adharra_active_product_id');
    setActiveProductId(prodId);
    if (prodId) {
      const prod = productService.getProducts().find(p => p.id === prodId);
      setActiveProduct(prod);
    } else {
      setActiveProduct(null);
    }
  };

  useEffect(() => {
    syncProductContext();
    window.addEventListener('adharra_active_product_changed', syncProductContext);
    return () => {
      window.removeEventListener('adharra_active_product_changed', syncProductContext);
    };
  }, [location]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  // Determine current page context
  const getPageContext = () => {
    const path = location.pathname;
    if (path.includes('/products')) return 'products';
    if (path.includes('/ai')) return 'ai-intelligence';
    if (path.includes('/quality')) return 'data-quality';
    if (path.includes('/validation')) return 'validation';
    if (path.includes('/settings')) return 'settings';
    if (path.includes('/upload')) return 'upload';
    return 'home';
  };

  const handleSend = async (textToSend) => {
    const msgText = textToSend || inputValue;
    if (!msgText.trim()) return;

    setErrorState(false);
    
    // Add user message
    const userMsg = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    saveMessages(updatedMessages);
    if (!textToSend) setInputValue('');

    // Start thinking
    setIsThinking(true);

    try {
      const context = {
        currentModule: getPageContext(),
        productId: activeProduct?.id || null,
        sku: activeProduct?.sku || null
      };

      const reply = await sendChatMessage(msgText, context);
      
      const assistantMsg = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: reply.answer,
        sources: reply.sources || [],
        action: reply.action || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      saveMessages([...updatedMessages, assistantMsg]);
    } catch (e) {
      setErrorState(true);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    saveMessages([]);
    setErrorState(false);
    setIsThinking(false);
  };

  // Skip rendering on auth routes
  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/'].includes(location.pathname);
  if (isAuthRoute) return null;

  return (
    <div style={{ zIndex: 9999 }}>
      {/* Floating launcher */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: isAppDark ? '#FFFFFF' : '#090C11',
            color: isAppDark ? '#111827' : '#FFFFFF',
            border: '1px solid var(--accent)',
            borderRadius: 30,
            padding: '12px 20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: isAppDark ? '0 8px 24px rgba(0, 0, 0, 0.25)' : '0 8px 24px rgba(0,0,0,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 9999,
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = isAppDark ? '0 10px 28px rgba(0, 0, 0, 0.35)' : '0 10px 28px rgba(0,0,0,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isAppDark ? '0 8px 24px rgba(0, 0, 0, 0.25)' : '0 8px 24px rgba(0,0,0,0.4)';
          }}
        >
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span>✦ ADHARRA AI</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div 
          className="adharra-chat-panel"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: '100%',
            maxWidth: 420,
            height: 'calc(100vh - 48px)',
            maxHeight: 620,
            background: cbBg,
            border: `1px solid ${cbBorder}`,
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            fontFamily: 'inherit',
            transition: 'background-color 0.3s, border-color 0.3s, color 0.3s'
          }}
        >
          {/* Header */}
          <div style={{ 
            background: cbSurfaceSec, 
            padding: '16px 20px', 
            borderBottom: `1px solid ${cbBorder}`, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            transition: 'background-color 0.3s, border-color 0.3s'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: cbTextPrimary, fontWeight: 700, fontSize: '0.95rem', transition: 'color 0.3s' }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                <span>ADHARRA Assistant</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: cbTextSecondary, marginTop: 2, transition: 'color 0.3s' }}>
                Ask about products, specs, AI, and quality issues.
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {messages.length > 0 && (
                <button 
                  onClick={clearChat}
                  title="Clear Chat"
                  style={{ background: 'none', border: 'none', color: cbTextSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, transition: 'color 0.3s' }}
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{ background: 'none', border: 'none', color: cbTextSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, transition: 'color 0.3s' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
 
          {/* Active context indicator */}
          {activeProduct && (
            <div style={{ 
              background: cbSurfaceSec, 
              borderBottom: `1px solid ${cbBorder}`, 
              padding: '8px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              transition: 'background-color 0.3s, border-color 0.3s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontWeight: 500 }}>
                <Cpu size={12} />
                <span>Context: {activeProduct.name.length > 30 ? activeProduct.name.substring(0, 30) + '...' : activeProduct.name}</span>
              </div>
              <span style={{ color: cbTextSecondary, fontSize: '0.7rem', transition: 'color 0.3s' }}>SKU: {activeProduct.sku}</span>
            </div>
          )}
 
          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Welcome State */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: cbSurfaceSec, border: `1px solid ${cbBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.3s, border-color 0.3s' }}>
                    <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ background: cbSurfaceSec, border: `1px solid ${cbBorder}`, borderRadius: '0 12px 12px 12px', padding: '12px 16px', fontSize: '0.85rem', color: cbTextPrimary, lineHeight: 1.5, transition: 'all 0.3s' }}>
                    <p style={{ fontWeight: 600, marginBottom: 8 }}>Hello! I’m the ADHARRA Assistant.</p>
                    <p style={{ marginBottom: 8 }}>Ask me about:</p>
                    <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc' }}>
                      <li>Product specifications</li>
                      <li>AI-extracted attributes</li>
                      <li>Confidence results</li>
                      <li>Data-quality issues</li>
                      <li>Validation status</li>
                    </ul>
                  </div>
                </div>
 
                {/* Quick Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: '0.72rem', color: cbTextSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'color 0.3s' }}>Suggested Questions</span>
                  
                  {activeProduct && (
                    <button 
                      onClick={() => handleSend(`Tell me about specifications for ${activeProduct.name}`)}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--accent-soft)',
                        border: '1px dashed var(--accent)',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        color: 'var(--accent)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'inherit'
                      }}
                    >
                      <span>Ask about active product: {activeProduct.sku}</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
 
                  {QUICK_CHIPS.map((chip, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSend(chip.query)}
                      style={{
                        padding: '8px 12px',
                        background: cbSurfaceSec,
                        border: `1px solid ${cbBorder}`,
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        color: cbTextSecondary,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'inherit',
                        transition: 'background 0.2s, color 0.2s, border-color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = cbSurface}
                      onMouseLeave={e => e.currentTarget.style.background = cbSurfaceSec}
                    >
                      <span>{chip.text}</span>
                      <ChevronRight size={13} style={{ color: cbTextSecondary }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
 
            {/* Conversation Messages */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    gap: 10
                  }}
                >
                  {!isUser && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: cbSurfaceSec, border: `1px solid ${cbBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.3s, border-color 0.3s' }}>
                      <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '80%' }}>
                    <div 
                      style={{
                        background: isUser ? 'var(--accent)' : cbSurfaceSec,
                        color: isUser ? userMsgText : cbTextPrimary,
                        border: isUser ? 'none' : `1px solid ${cbBorder}`,
                        borderRadius: isUser ? '12px 12px 0 12px' : '0 12px 12px 12px',
                        padding: '10px 14px',
                        fontSize: '0.84rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-line',
                        transition: 'background-color 0.3s, border-color 0.3s, color 0.3s'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
 
                    {/* Action navigation button */}
                    {!isUser && msg.action && (
                      <button
                        onClick={() => { navigate(msg.action.route); setIsOpen(false); }}
                        style={{
                          marginTop: 6,
                          padding: '7px 14px',
                          background: 'var(--accent)',
                          color: userMsgText,
                          border: 'none',
                          borderRadius: 8,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'inherit',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <ChevronRight size={13} /> {msg.action.label}
                      </button>
                    )}

                    {/* Sources citation section */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div style={{
                        marginTop: 4,
                        padding: '6px 10px',
                        background: cbSurface,
                        border: `1px solid ${cbBorder}`,
                        borderRadius: 6,
                        fontSize: '0.72rem',
                        color: cbTextSecondary,
                        transition: 'background-color 0.3s, border-color 0.3s, color 0.3s'
                      }}>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, color: 'var(--accent)' }}>
                          <FileText size={11} /> Sources
                        </div>
                        {msg.sources.map((s, idx) => (
                          <div key={idx} style={{ color: cbTextSecondary }}>• {s.name} — Page {s.page}</div>
                        ))}
                      </div>
                    )}
                    
                    <span style={{ fontSize: '0.68rem', color: cbTextMuted, alignSelf: isUser ? 'flex-end' : 'flex-start', transition: 'color 0.3s' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
 
            {/* Thinking / Loader state */}
            {isThinking && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: cbSurfaceSec, border: `1px solid ${cbBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.3s, border-color 0.3s' }}>
                  <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ background: cbSurfaceSec, border: `1px solid ${cbBorder}`, borderRadius: '0 12px 12px 12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, transition: 'background-color 0.3s, border-color 0.3s' }}>
                  <span style={{ fontSize: '0.78rem', color: cbTextSecondary, transition: 'color 0.3s' }}>ADHARRA is thinking</span>
                  <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                    {[0, 1, 2].map(dot => (
                      <div 
                        key={dot}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          animation: 'pulse 1.2s infinite',
                          animationDelay: `${dot * 0.2}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
 
            {/* Error state */}
            {errorState && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--danger)' }}>
                  <AlertCircle size={14} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Unable to get a response right now.</div>
                  <button 
                    onClick={() => handleSend()}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '4px 8px',
                      background: 'none',
                      border: `1px solid ${cbBorder}`,
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      color: cbTextPrimary,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.3s, color 0.3s'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
            
            <div ref={messageEndRef} />
          </div>
 
          {/* Footer Input Area */}
          <div style={{ 
            padding: '16px 20px', 
            borderTop: `1px solid ${cbBorder}`, 
            background: cbSurfaceSec,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            transition: 'background-color 0.3s, border-color 0.3s'
          }}>
            <input 
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Ask ADHARRA anything..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                background: cbInputBg,
                border: `1px solid ${isInputFocused ? 'var(--accent)' : cbBorder}`,
                color: cbTextPrimary,
                fontSize: '0.84rem',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s, background-color 0.3s, color 0.3s'
              }}
            />
            <button 
              disabled={!inputValue.trim() || isThinking}
              onClick={() => handleSend()}
              style={{
                background: inputValue.trim() && !isThinking ? 'var(--accent)' : cbBorder,
                color: inputValue.trim() && !isThinking ? userMsgText : cbTextMuted,
                border: 'none',
                borderRadius: 8,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputValue.trim() && !isThinking ? 'pointer' : 'default',
                transition: 'background 0.2s, color 0.2s'
              }}
            >
              <Send size={15} />
            </button>
          </div>
 
        </div>
      )}
    </div>
  );
}
