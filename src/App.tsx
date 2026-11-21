import { useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronRight, Clock3, FileText, ImagePlus, Lightbulb, LoaderCircle, Paperclip, Sparkles, UploadCloud, X } from 'lucide-react';
import { extractBookReference, readPlanFile, type FileInfo } from './documentProcessing';
type Activity = { title: string; time: string; description: string; materials: string[]; book?: string; objective: string };
const examples: Activity[] = [
  { title: 'Caça às palavras-chave', time: '15 min', description: 'Em duplas, os alunos procuram no texto três palavras que expressem as ideias centrais do tema. Cada dupla explica uma escolha para a turma.', materials: ['Texto ou livro didático', 'Caderno'], objective: 'Identificar conceitos centrais e explicar seu significado.' },
  { title: 'Mapa de ideias coletivo', time: '20 min', description: 'No quadro, a turma constrói um mapa conectando o tema principal a exemplos do cotidiano. Convide os alunos a justificar cada ligação.', materials: ['Quadro e marcadores', 'Caderno'], objective: 'Relacionar conceitos e organizar informações visualmente.' },
  { title: 'Saída de aprendizagem', time: '10 min', description: 'Antes de encerrar, cada aluno escreve uma coisa que aprendeu, uma pergunta que ainda tem e um exemplo que consegue dar.', materials: ['Papel ou caderno'], objective: 'Verificar a compreensão e identificar dúvidas para a próxima aula.' },
];
function buildActivities(text: string, grade: string, subject: string, period: string): Activity[] {
  const book = extractBookReference(text);
  const lower = text.toLocaleLowerCase('pt-BR');
  const topic = text.split(/[\n.!?]/).map(x => x.trim()).filter(x => x.length > 12).slice(0, 1)[0];
  const context = [topic, grade && `Turma: ${grade}`, subject && `Componente: ${subject}`, `Período: ${period.toLocaleLowerCase('pt-BR')}`].filter(Boolean).join(' · ');
  const result = examples.map((a, i) => ({ ...a, title: i === 0 && lower.includes('leitura') ? 'Leitura com pistas' : a.title, description: context ? `${a.description} Adapte ao seu contexto: ${context.slice(0, 160)}${context.length > 160 ? '…' : ''}.` : a.description, book }));
  return result;
}
function App() {
  const inputRef = useRef<HTMLInputElement>(null); const readingRef = useRef(false); const [file, setFile] = useState<FileInfo | null>(null); const [dragging, setDragging] = useState(false); const [loading, setLoading] = useState(false); const [progress, setProgress] = useState(''); const [error, setError] = useState(''); const [text, setText] = useState(''); const [activities, setActivities] = useState<Activity[] | null>(null); const [period, setPeriod] = useState('Semanal'); const [grade, setGrade] = useState(''); const [subject, setSubject] = useState('');
  async function handleFile(f?: File) {
    if (!f || readingRef.current) return;
    readingRef.current = true;
    setError(''); setActivities(null); setLoading(true);
    try {
      const info = await readPlanFile(f, setProgress);
      if (!info.text.trim()) throw new Error('Não encontrei texto legível. Tente uma imagem mais nítida ou um documento com texto selecionável.');
      setFile(info); setText(info.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ler este arquivo.');
      setFile(null); setText(''); setActivities(null);
    } finally {
      readingRef.current = false; setLoading(false); setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }
  function generate() { if (!text.trim()) { setError('Adicione um plano de aula para começar.'); return; } setError(''); setActivities(buildActivities(text, grade, subject, period)); }
  function removeFile() { setFile(null); setText(''); setActivities(null); if (inputRef.current) inputRef.current.value = ''; }
  return <main className="app-shell"><aside className="rail"><div className="brand"><div className="brand-icon"><BookOpen size={20}/></div><span>plano<span className="brand-light">em prática</span></span></div><div className="rail-bottom"><span className="avatar">P</span></div></aside>
    <section className="workspace"><header className="topbar"><div className="breadcrumb">Espaço da professora <ChevronRight size={14}/> <span>Novo planejamento</span></div><div className="profile" aria-label="Minha área"><span className="avatar small">P</span><span>Minha área</span></div></header>
      <div className="content"><div className="intro"><div className="eyebrow"><Sparkles size={14}/> PLANEJE COM MAIS LEVEZA</div><h1>Seu plano de aula,<br/><em>cheio de possibilidades.</em></h1><p>Compartilhe seu planejamento e receba sugestões iniciais para adaptar à sua turma.</p></div>
        <div className="form-grid"><div className="main-column"><section className="panel upload-panel"><div className="section-title"><span className="step">1</span><div><h2>Adicione seu plano</h2><p>Pode ser um planejamento trimestral, mensal ou semanal.</p></div></div>
          {!file ? <div className={`dropzone ${dragging ? 'dragging' : ''}`} aria-busy={loading} aria-disabled={loading} aria-describedby="upload-formats upload-status" onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);void handleFile(e.dataTransfer.files[0])}} onClick={()=>{if(!loading)inputRef.current?.click()}} role="button" tabIndex={loading ? -1 : 0} onKeyDown={e=>{if(!loading&&(e.key==='Enter'||e.key===' ')){e.preventDefault(); inputRef.current?.click()}}}><input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,text/plain" hidden onChange={e=>void handleFile(e.target.files?.[0])}/><div className="upload-icon">{loading?<LoaderCircle className="spin" aria-hidden="true"/>:<UploadCloud size={22}/>}</div><strong>{loading ? progress : 'Arraste seu arquivo até aqui'}</strong><span>{loading ? 'Isso pode levar alguns instantes' : 'ou clique para escolher no seu dispositivo'}</span><div className="file-types" id="upload-formats"><span><FileText size={14}/> PDF</span><span><FileText size={14}/> DOCX</span><span><FileText size={14}/> TXT</span><span><ImagePlus size={14}/> Imagens</span></div><span id="upload-status" className="sr-only" role="status" aria-live="polite">{loading ? progress || 'Lendo arquivo' : ''}</span></div> : <div className="file-card"><div className="file-icon"><FileText size={20}/></div><div className="file-details"><strong>{file.name}</strong><span>{file.pages ? `${file.pages} páginas · ` : ''}Texto extraído no seu dispositivo</span></div><button className="icon-button" title="Remover arquivo" aria-label="Remover arquivo" onClick={removeFile}><X size={17}/></button><Check className="file-check" size={17}/></div>}
          {!file && <><p className="upload-formats-note">Aceita PDF, DOCX, TXT ou imagens (PNG, JPG, WEBP e BMP), até 15 MB.</p><label className="manual-plan">Ou cole o texto do plano<textarea value={text} onChange={e=>{setText(e.target.value);setActivities(null);setError("")}} placeholder="Cole aqui o conteúdo do seu planejamento…" rows={5}/></label></>}
          <div className="privacy-note"><span className="privacy-dot"/> Seus arquivos são lidos neste dispositivo e não são enviados a um servidor.</div>
          {file&&<details className="text-preview"><summary><span>Conferir texto reconhecido</span><ChevronDown size={15}/></summary><textarea value={text} onChange={e=>{setText(e.target.value);setActivities(null)}} aria-label="Texto reconhecido do plano" rows={6}/></details>}
        </section>
        <section className="panel details-panel"><div className="section-title"><span className="step">2</span><div><h2>Conte um pouco sobre a turma</h2><p>As sugestões consideram estas informações como contexto.</p></div></div><div className="fields"><label>Ano ou faixa etária <input value={grade} onChange={e=>setGrade(e.target.value)} placeholder="Ex.: 4º ano do Ensino Fundamental"/></label><label>Componente curricular <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Ex.: Ciências"/></label><label className="period-label">Período do planejamento<select value={period} onChange={e=>setPeriod(e.target.value)}><option>Semanal</option><option>Mensal</option><option>Trimestral</option><option>Outro período</option></select></label></div></section>
        <button className="generate-button" onClick={generate} disabled={loading}><Sparkles size={18}/> Criar sugestões de atividades <ChevronRight size={17}/></button>{error&&<p className="error" role="alert">{error}</p>}</div>
        <aside className="side-column"><div className="side-card side-tip"><div className="tip-icon"><Lightbulb size={20}/></div><span className="side-eyebrow">UMA DICA</span><h3>Sugestões para adaptar.</h3><p>As atividades são exemplos iniciais baseados no texto e nas informações da turma. Revise e adapte antes de usar.</p><div className="tip-decoration">✳</div></div><div className="side-card book-rule"><div className="book-rule-icon"><BookOpen size={17}/></div><div><strong>Sobre as páginas do livro</strong><p>Se o plano mencionar páginas de um livro, as atividades destacarão essa referência para você conferir o trecho.</p></div></div><div className="side-card accepted"><span className="side-eyebrow">FORMATOS ACEITOS</span><div><Paperclip size={15}/> PDF, DOCX, TXT e imagens</div><small>Documentos de até 15 MB</small></div></aside></div>
        {activities&&<section className="results" aria-live="polite"><div className="results-header"><div><div className="eyebrow"><Sparkles size={14}/> SUGESTÕES INICIAIS</div><h2>Um ponto de partida para {subject ? subject : 'sua turma'}.</h2><p>{grade ? `${grade} · ` : ''}Planejamento {period.toLowerCase()} · adapte cada proposta ao seu contexto.</p></div></div><div className="activity-grid">{activities.map((a,i)=><article className="activity-card" key={i}><div className="activity-top"><span className="activity-number">0{i+1}</span><span className="time"><Clock3 size={14}/>{a.time}</span></div><h3>{a.title}</h3><p>{a.description}</p><div className="objective"><strong>O que se desenvolve</strong><span>{a.objective}</span></div><div className="materials"><strong>Você vai precisar</strong><div>{a.materials.map(m=><span key={m}>{m}</span>)}</div></div>{a.book&&<div className="book-reference"><BookOpen size={15}/><div><strong>{a.book} do livro didático</strong><span>Consulte a página indicada no seu plano.</span></div></div>}</article>)}</div><p className="results-disclaimer"><Lightbulb size={15}/> Sugestões iniciais: confira se fazem sentido para os objetivos, o conteúdo e a realidade da turma.</p></section>}
      </div><footer>Feito para apoiar quem ensina <span>·</span> Você conhece sua turma melhor do que qualquer plano</footer>
    </section></main>;
}
export default App;





