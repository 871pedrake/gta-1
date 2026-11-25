# GDD — Mapa 3D Metrópole Cidade Nova (Port para Unity URP)

**Projeto:** Garagem Conceito 50 · Cidade Nova (Mundo Aberto Estilo GTA)  
**Escala:** `1 unidade = 1 metro` (`1u = 1m`)  
**Passo da Malha Viária:** 6 colunas centrais (`X ∈ {-85, -51, -17, +17, +51, +85}`, `23m × 23m`) + **2 bulevares externos (`X = -148` e `+148`) com 6 quadras largas (`33m × 23m`)** centradas em `X = -125` e `X = +125`.

---

## 1. Relevo Extremo & Sistema de Coordenadas (`cityElevation`)

O mapa possui contraste nítido entre a **parte mais baixa** (Rio `-1.25m` e Cais Baixo `-0.85m`) e a **parte mais alta** (Cidade Alta `+9.00m`, Mirante Alto da Serra Sul `+13.80m` e Serra da Nascente Norte `+26.0m`), ligadas por duas ladeiras contínuas (~11°):

| Faixa `Z` | Setor / Via | Elevação Viária (`cityRoadY`) | Platô / Destaque |
| :--- | :--- | :--- | :--- |
| `Z ∈ [8, 26]` | **Parte Mais Baixa:** Canal do Rio, Cais Baixo (`X = -18, +18`) & Praia Leste | **`-1.25m`** (água) | **`-0.85m`** (Cais em granito + píer) & **`+0.18m → -1.48m`** (Praia) |
| `Z >= -39.5` | **Baixada:** Marginal Norte (`34`), Av. Beira-Rio (`0`), Praça/Shopping/Orla (`-17`), Rua das Lojas (`-34`) | **`0.00m`** | **`0.00m`** |
| `-62.5 < Z < -39.5` | **Ladeira 1:** Sobe da Rua das Lojas até a Av. `Z = -68` | **`0.00m → +4.50m`** | **`+2.25m`** (Quadras `Z = -51` com escadas frontais e traseiras) |
| `-73.5 <= Z <= -62.5` | **Patamar Médio:** Av. Panorâmica `Z = -68` + 2 Rotatórias (`-68,-68` e `+68,-68`) | **`+4.50m`** | — |
| `-96.5 < Z < -73.5` | **Ladeira 2:** Sobe da Av. `Z = -68` até a Cidade Alta | **`+4.50m → +9.00m`** | **`+6.75m`** (Residencial 1, **Escola E.M.** `-17,-85` & Parque `+17,-85`) |
| `-130 <= Z <= -96.5` | **Cidade Alta:** Av. Superior `Z = -102` e Residencial 2 (`Z = -119`) | **`+9.00m`** | **`+9.00m`** |
| `Z < -130` | **Parte Urbana Mais Alta:** Rampa panorâmica em `X = 0` até o **Mirante Alto da Serra Sul (`0, -144`)** | **`+9.0m → +13.8m`** | **`+13.80m`** (Mirante de vidro, obelisco, lunetas e Ipês) |

---

## 2. Regras Explícitas de Projeto (Contrato Obrigatório para Unity)

1. **REGRA-01 — Hierarquia Altimétrica Completa (`-0,85m → +13,8m`):** Toda a malha urbana deve seguir `cityRoadY(z)`, `blockTerraceY(z)` e `cityBasinTerrainY(x,z)`, preservando o Cais Baixo (`-0.85m`) e o Mirante Sul (`+13.8m`) como polos extremos acessíveis por escadas e rampa pavimentada, sem degraus acidentais em cruzamentos.
2. **REGRA-02 — Hidrologia Contínua (Nascente + Córrego + Rio + Barcos):** A água nasce na **Nascente da Serra (`+84, +114`)** em paredão rochoso com cachoeira, percorre o **Córrego da Esperança (`creekCenterX`)** entre pedras musgosas, corredeiras e pinguela (`Z = 62`), atravessa a galeria da Marginal Norte (`Z = 34`) e deságua no **Rio Central (`-1.25m`)**, onde operam **5 embarcações reais do catálogo**: `VHC-44` (Lancha Ipanema), `VHC-45` (Jet Ski), `VHC-46` (Bote Resgate), `VHC-47` (Rebocador) navegando + `VHC-50` atracado no píer do Cais Baixo.
3. **REGRA-03 — Vegetação Botânica Multi-Polígono:** É proibido usar árvores ou arbustos de polígono único. Árvores folhosas possuem raízes sapopembas, tronco curvado segmentado, 4 galhos primários, 4 sub-ramos e copa com 13 aglomerados orgânicos de folhas; palmeiras possuem tronco anelado em 6 segmentos, palmito e 11 frondes arqueadas em 2 segmentos; arbustos possuem 7 moitas orgânicas com botões florais.
4. **REGRA-04 — Sinalização Viária Completa & Pontos de Ônibus Modernos:** São obrigatórios **3 pórticos metálicos aéreos** (`vão >= 5,6m`), **5 placas azuis de nome de rua**, **2 totens iluminados de Guia da Cidade**, placas regulamentares/advertência/turísticas (`PARE`, `60 km/h`, `Ladeira 11%`, `Pedestre`, `Área Escolar`, `Proibido Estacionar`, `Nascente & Córrego`, `Mirante Sul`) e **abrigos de ônibus Linha 50** fora da pista com 4 pilares, teto iluminado, vidro temperado, banco apoiado em 3 pés e painel de rotas `MUPI`.
5. **REGRA-05 — Coerência Comercial & Zero Sobreposição Viária:** Nenhuma loja, abrigo ou placa pode bloquear avenidas (`X = -34`, `X = 0`) ou olhar contra muros de arrimo (`Z = -62.5`) ou fundos de prédios (`Z = -23.5`). Na base do Morro (`Z = 38.8`) são permitidos apenas comércios comunitários autênticos entre os vãos dos escadões.
6. **REGRA-06 — Contraste Socioespacial, Escola Pública & Praia da Orla Leste:** Preservar a leitura socioespacial entre o Morro da Esperança (`|X| <= 66`), os setores financeiro/residencial e a vida pública compartilhada: **Escola Municipal E.M. Cidade Nova (`-17, -85 @ +6.75m`)** ligada à `Av. Panorâmica (+4.5m)` por escadaria/rampa acessível, com quadra poliesportiva, papelaria de esquina, placas de `Área Escolar` e `Escolar Amarelinho`; e **Praia da Orla Leste (`X ∈ [+40,+62]` e `[+74,+98]`)** com calçadão em pedra portuguesa, dois quiosques (`Água de Coco` e `Brisa do Mar`), futevôlei e posto salva-vidas sem obstruir o canal dos barcos.

---

## 3. Zoneamento Estrito, Comércio & Correções do Morro

### 3.1 Shopping, Gastronomia & Moda (Leste · Baixada `0m` e Terraço `+2.25m`)
- **Baixada (`Z = -17`, `0.0m`):** Shopping Metrópole (`+17`), Passarela Aérea (`+34`), Estacionamento com veículos (`+51`), Galeria Moda & Multiplex (`+85`) + **Açaí Tropical** e **Eletrônicos BR** (`Z = -23.5`) rotacionados (`Math.PI`) para abrir frente para a Rua das Lojas (`Z = -34`).
- **Terraço Comercial (`Z = -51`, `+2.25m`, escadas em `Z = -39.5` e `Z = -59.8`):**
  - **Café & Tech (`-17,-51`):** Café Carioca, Cyber 50 (Norte), Express 24H e Barbearia (laterais Leste/Oeste).
  - **Automotivo (`+17,-51`):** Motors 50 (vitrine giratória) e Oficina Turbo (face lateral aberta).
  - **Polo Gastronômico (`+51,-51`):** Burger 50, Pizzaria Nobile (Norte), Churrascaria Brasa (Oeste) e Padaria Pão Quente (Leste).
  - **Polo Moda & Roupa (`+85,-51`):** Moda Urbana, Atelier Vestir (Norte), Tênis & Sneakers (Oeste) e Farmácia Popular (Leste).

### 3.2 Morro da Esperança (`|X| <= 66`) & Comércio Comunitário Autêntico (`Z = 38.8`)
- **4 Lojas Comunitárias Alinhadas (livres de pistas e escadões):**
  - `X = -56.0`: **Mercearia Esperança** (entre Av. `-68` e Escadão `-46`)
  - `X = -24.8`: **Espetinho da Laje** (entre Av. `-34` e Escadão `-16`)
  - `X = +24.4`: **Açaí do Morro** (entre Estrada `+14` e Escadão `+34`)
  - `X = +52.0`: **Corte Real Barber** (entre Av. `+34` e Av. `+68`)
- **5 Segmentos de Muro (`Z = 41.9`):** `[-82,-50]`, `[-42,-20]`, `[-12,9.2]`, `[18.8,30]`, `[38,81]` liberando os 3 escadões (`-46, -16, +34`), a estrada (`+14`) e a saída do Córrego (`+86`).
- **Fundações `hMin..hMax` & Janelas `+Z/-Z`:** Amostragem de 5 pontos (`piso = hMax + 0.14m`, `fundação = hMin - 1.4m`), margem AABB `0.45m` e exclusão de casas/troncos dentro de `dCreek < 4.6m` e `dSpring < 7.2m`.

### 3.3 Escola Pública (`-17, -85`) & Praia da Orla Leste (`+40..+98`)
- **E.M. Cidade Nova (`-17, -85 @ +6.75m`):** 2 blocos de aulas em L com telhado cerâmico e varanda sombreada, quadra poliesportiva azul/terracota com tabelas, pórtico iluminado, muro com gradil, escadaria + rampa acessível para `Z = -68`, `Papelaria do Estudante` na esquina e `Escolar Amarelinho (VHC-33)` estacionado fora da faixa ativa.
- **Praia da Orla Leste (`X ∈ [+40,+62]` e `[+74,+98]`, `Z = 5.0..12.8`):** Muralha sul do canal aberta nos dois trechos de enseada; calçadão em pedra portuguesa ondulada estilo Copacabana; **Quiosque Água de Coco** (`+45.2`) e **Quiosque Brisa do Mar** (`+82.5`); guarda-sóis, espreguiçadeiras, quadra de futevôlei (`+54.5`) e posto salva-vidas (`+91.5`).

### 3.4 Expansão Lateral (`X = ±125`, `33m × 23m`) & Bulevares Externos (`X = ±148`)
- **Prédios Largos de Moradia (2 em 1):** Localizados em `(-125, -51 @ +2.25m)`, `(-125, -85 @ +6.75m)` e `(+125, -85 @ +6.75m)`. Possuem ~30m de largura total com duas alas residenciais unidas por átrio central envidraçado + 3 passarelas elevadas, fundações em granito, gradil e guarita, duas portarias de vidro duplo com marquise, garagens duplas, sacadas com guarda-corpo de vidro, pilhas de condensadores de AC, caixas d'água e chillers.
- **Prédios de Vendas de Empresas com Outdoors & Estacionamentos:** Localizados em `(-125, -17 @ 0.0m)`, `(+125, -17 @ 0.0m)` e `(+125, -51 @ +2.25m)`. Integram torres de vendas com showrooms em vidro duplo, grandes outdoors metálicos iluminados (topo e esquinas) e estacionamentos asfaltados completos com vagas demarcadas, bate-rodas amarelos, guarita, cancela, iluminação LED e veículos estacionados.
- **Malha Viária Estruturada:** Avenidas E–O (`Z = 0, -34, -68, -102`) estendidas até `X = ±153.2`, ligadas aos bulevares N–S externos `X = -148` e `X = +148` com 8 novos cruzamentos, faixas de pedestre, semáforos, postes e tráfego contínuo.

---

## 4. Especificação Técnica de Port para Unity URP

### 4.1 Hierarquia Recomendada de Scene
```text
MetropoleCidadeNova (Root)
├── 00_Sistema/
│   ├── CidadeSemaforoControlador (ciclo 16s + 3 pórticos aéreos + Área Escolar)
│   ├── TrafegoCidade50 (veículos com pitch em ladeira até X=±148 + 5 barcos reais + 2 helis)
│   ├── GeradorDeNpcs (agentes CidadePedestreAgente em -0.85m..+13.8m)
│   └── CidadeOtimizadorRuntime (LODs + GPU Instancing vegetal)
├── 01_Hidrologia_Praia_Cais/ (Cais Baixo -0.85m, Píer, Praia Leste, Rio, Nascente 84,114 e Córrego)
├── 02_Area_Predios_Oeste/ (X = -102..-34 · Y = 0m e +2.25m)
├── 02B_Expansao_MoradiaLarga_e_Vendas/ (X = ±125 · 3 Prédios 2-em-1 + 3 Vendas c/ Outdoors & Estacionamento)
├── 03_Area_Shopping_Comercio/ (Shopping + Gastronomia + Moda + Quiosques + Abrigos MUPI)
├── 04_Residencia_Escola_Mirante/ (Z <= -68 · 10 quadras + E.M. Cidade Nova + Mirante Sul +13.8m)
└── 05_Morro_Esperanca_Norte/ (Maciço |X|<=66, Lojas Base, 5 Muros, 3 Escadões, Córrego)
```

### 4.2 Colliders, Água, Física em Ladeira & NavMesh
- **Água & Barcos:** `CidadeAguaAnimada` com scroll contínuo de UV nos dois eixos (`offset.x` e `-offset.y`) aplicado ao Rio (`Y = -1.25m`), Córrego e Nascente; `CidadeTriggerAgua` cobrindo o canal navegável e zona rasa da Praia (`Z >= 11.6`).
- **Tráfego em Ladeira (`TrafegoCidade50`):** Atualizar `transform.position.y = cityRoadY(z) + 0.04f` e inclinar `rotation.x = -dir * Mathf.Atan(cityRoadSlopeDZ(z))` ao cruzar `Z ∈ [-96.5, -39.5]` inclusive nos bulevares `X = ±148`.
- **NavMesh (`Humanoid`, `Max Slope = 42°`, `Step Height = 0.45m`):** Incluir `OffMeshLinks` nas escadas do Cais Baixo (`Z = 5.4..6.8`), escada/rampa da Escola (`-17, -73.5`), escadarias comerciais (`Z = -39.5` e `Z = -59.8`), Passarela (`+34,-17`), pinguela do Córrego (`Z = 62`) e base dos 3 Escadões (`Z = 42`).
