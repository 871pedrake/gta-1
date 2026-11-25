import React, { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { VehicleConcept } from '../types/vehicle';
import { generateUnityCSharpForVehicle } from '../utils/unityExporter';
import {
  generateControleVeiculo50Cs,
  generateFabrica50VeiculosCs,
  generateInteragirVeiculo50Cs,
  generateTrafegoCidade50Cs,
} from '../utils/unityPackageTemplates';

interface UnityExportViewProps {
  vehicles: VehicleConcept[];
  selectedVehicle: VehicleConcept;
  onSelectVehicle: (v: VehicleConcept) => void;
}

type ScriptTab = 'fabrica' | 'controle' | 'interagir' | 'trafego' | 'single';

export const UnityExportView: React.FC<UnityExportViewProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
}) => {
  const [mode, setMode] = useState<ScriptTab>('fabrica');
  const [copied, setCopied] = useState(false);

  const { code, filename } = useMemo(() => {
    switch (mode) {
      case 'controle':
        return { code: generateControleVeiculo50Cs(), filename: 'ControleVeiculo50.cs' };
      case 'interagir':
        return { code: generateInteragirVeiculo50Cs(), filename: 'InteragirVeiculo50.cs' };
      case 'fabrica':
        return { code: generateFabrica50VeiculosCs(vehicles), filename: 'Fabrica50Veiculos.cs' };
      case 'trafego':
        return { code: generateTrafegoCidade50Cs(), filename: 'TrafegoCidade50.cs' };
      case 'single':
      default:
        return {
          code: generateUnityCSharpForVehicle(selectedVehicle),
          filename: `Gerador_${selectedVehicle.code.replace('-', '')}.cs`,
        };
    }
  }, [mode, selectedVehicle, vehicles]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadFile = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="max-w-[1360px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Step-by-step Unity Installation Guide */}
        <div className="lg:col-span-4 space-y-5">
          <div>
            <div className="text-xs font-mono-tech text-amber-400">PACOTE COMPLETO UNITY (3 SCRIPTS)</div>
            <h1 className="font-display text-3xl font-bold text-zinc-100 mt-1">
              Instalação Perfeita na Unity
            </h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              Integrado diretamente com <span className="font-mono-tech text-zinc-200">CameraGTA</span>, <span className="font-mono-tech text-zinc-200">MovimentoJogador</span>, <span className="font-mono-tech text-zinc-200">AparenciaPersonagem</span>, <span className="font-mono-tech text-zinc-200">NpcVidaPropria</span> e <span className="font-mono-tech text-zinc-200">GeradorCidadeInicial</span>.
            </p>
          </div>

          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-zinc-200">Baixar os 4 Scripts Otimizados</div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => downloadFile('ControleVeiculo50.cs', generateControleVeiculo50Cs())}
                className="flex items-center justify-between px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg hover:border-amber-500/60 text-zinc-200 cursor-pointer"
              >
                <span className="font-mono-tech">1. ControleVeiculo50.cs</span>
                <Download className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={() => downloadFile('InteragirVeiculo50.cs', generateInteragirVeiculo50Cs())}
                className="flex items-center justify-between px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg hover:border-amber-500/60 text-zinc-200 cursor-pointer"
              >
                <span className="font-mono-tech">2. InteragirVeiculo50.cs</span>
                <Download className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={() => downloadFile('Fabrica50Veiculos.cs', generateFabrica50VeiculosCs(vehicles))}
                className="flex items-center justify-between px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg hover:border-amber-500/60 text-zinc-200 cursor-pointer"
              >
                <span className="font-mono-tech">3. Fabrica50Veiculos.cs</span>
                <Download className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={() => downloadFile('TrafegoCidade50.cs', generateTrafegoCidade50Cs())}
                className="flex items-center justify-between px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg hover:border-amber-500/60 text-zinc-200 cursor-pointer"
              >
                <span className="font-mono-tech">4. TrafegoCidade50.cs</span>
                <Download className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>

          <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-2.5 text-xs text-zinc-400 leading-relaxed">
            <div className="font-semibold text-zinc-200">Passo a Passo na Unity:</div>
            <p><strong className="text-zinc-200">1.</strong> Crie uma pasta <span className="font-mono-tech text-zinc-200">Assets/Scripts/Veiculos50</span> e coloque os 3 arquivos baixados.</p>
            <p><strong className="text-zinc-200">2.</strong> Confira que seu jogador tem a Tag <span className="font-mono-tech text-zinc-200">Player</span> e os scripts <span className="font-mono-tech text-zinc-200">MovimentoJogador</span> + <span className="font-mono-tech text-zinc-200">AparenciaPersonagem</span>.</p>
            <p><strong className="text-zinc-200">3.</strong> Na <span className="font-mono-tech text-zinc-200">Main Camera</span>, garanta que o script <span className="font-mono-tech text-zinc-200">CameraGTA</span> (de CameraSeguir.cs) esteja ativo.</p>
            <p><strong className="text-zinc-200">4.</strong> No menu superior da Unity clique em <span className="text-amber-400">Cidade &gt; Veículos &gt; Gerar Frota Completa (50 Modelos)</span> para criar todos os 50 prefabs na cena, ou anexe <span className="font-mono-tech text-zinc-200">Fabrica50Veiculos</span> em um objeto vazio para trocar veículos em jogo com <span className="font-mono-tech text-zinc-200">F2</span>.</p>
            <p><strong className="text-zinc-200">5.</strong> Aperte <span className="font-mono-tech text-zinc-200">Play</span>: use <span className="font-mono-tech text-zinc-200">E</span> para entrar/sair, <span className="font-mono-tech text-zinc-200">WASD</span> para dirigir, <span className="font-mono-tech text-zinc-200">Shift</span> turbo, <span className="font-mono-tech text-zinc-200">Espaço</span> freio/subir helicóptero e <span className="font-mono-tech text-zinc-200">L</span> para faróis e giroflex.</p>
          </div>

          {mode === 'single' && (
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
              <label className="block text-xs font-medium text-zinc-400">
                Veículo Individual Selecionado
              </label>
              <select
                value={selectedVehicle.id}
                onChange={(e) => {
                  const found = vehicles.find((v) => v.id === Number(e.target.value));
                  if (found) onSelectVehicle(found);
                }}
                className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} — {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-x-auto">
              {(
                [
                  ['trafego', '4. TrafegoCidade50.cs'],
                  ['fabrica', '3. Fabrica50Veiculos.cs'],
                  ['controle', '1. ControleVeiculo50.cs'],
                  ['interagir', '2. InteragirVeiculo50.cs'],
                  ['single', `Avulso (${selectedVehicle.code})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                    mode === id
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={() => downloadFile(filename, code)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar {filename}
              </button>
            </div>
          </div>

          <pre className="flex-1 p-5 overflow-auto text-xs font-mono-tech text-zinc-300 leading-relaxed max-h-[70vh]">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
