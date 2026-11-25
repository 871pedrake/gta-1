using System.Collections.Generic;
using System.Reflection;
using UnityEngine;

public partial class GeradorCidadeInicial
{
    [Header("Melhorias do Morro e Terreno")]
    [Tooltip("Limita a altura visual para evitar paredões artificiais muito íngremes.")]
    [Min(8f)] public float alturaMaximaVisualMorro = 24f;

    [Tooltip("Profundidade mínima da encosta para permitir subidas e platôs naturais.")]
    [Min(45f)] public float profundidadeVisualMorro = 88f;

    [Range(0f, 0.85f)]
    [Tooltip("Força dos degraus/patamares naturais no relevo do morro.")]
    public float intensidadePatamares = 0.28f;

    public bool criarVegetacaoERochasMorro = true;
    public bool criarTerrenoEntornoCidade = true;

    [System.NonSerialized] private bool morroDadosProntos;
    [System.NonSerialized] private int morroSeedAtual = int.MinValue;
    [System.NonSerialized] private int morroLadoInt;
    [System.NonSerialized] private float morroBordaBase;
    [System.NonSerialized] private float morroMeiaLargura;
    [System.NonSerialized] private float morroProfundidade;
    [System.NonSerialized] private float morroAltura;
    [System.NonSerialized] private float morroAlongEntrada;
    [System.NonSerialized] private float morroLarguraEstradaEfetiva = 6.2f;
    [System.NonSerialized] private float[] morroAlongEscadas = new float[2];

    [System.NonSerialized] private float[,] morroGrid;
    [System.NonSerialized] private int morroGridNX = 160;
    [System.NonSerialized] private int morroGridNZ = 112;

    [System.NonSerialized] private readonly List<Vector3> morroPontosEstrada = new List<Vector3>();
    [System.NonSerialized] private readonly List<Vector3>[] morroPontosEscadas =
    {
        new List<Vector3>(),
        new List<Vector3>()
    };
    [System.NonSerialized] private readonly List<PlatoMorro> morroPlatos = new List<PlatoMorro>();

    [System.NonSerialized] private Texture2D texTerrenoMorro;
    [System.NonSerialized] private Texture2D texPedraArrimo;
    [System.NonSerialized] private Texture2D texTijoloFavela;
    [System.NonSerialized] private Texture2D texTelhadoZinco;
    [System.NonSerialized] private Texture2D texTelhadoBarro;
    [System.NonSerialized] private Texture2D texCampinhoGrama;
    [System.NonSerialized] private Texture2D texMuralGrafite;
    [System.NonSerialized] private Texture2D texToldoListrado;

    private struct PlatoMorro
    {
        public float along;
        public float depth;
        public float halfAlong;
        public float halfDepth;
        public float altura;
        public float suavizacao;
    }

    partial void PrepararTexturasEtapa3()
    {
        morroDadosProntos = false;
        if (!LerBoolMorro(true, "criarMorro")) return;

        GarantirDadosMorro();
        if (!usarTexturas) return;

        int s = seedAleatoria;

        texTerrenoMorro = NovaTextura("TexTerrenoMorro", 512, (px, py) =>
        {
            float u = (px + 0.5f) / 512f;
            float v = (py + 0.5f) / 512f;

            float along = Mathf.Lerp(-morroMeiaLargura, morroMeiaLargura, u);
            float depth = Mathf.Lerp(0f, morroProfundidade, v);

            float h = AmostrarGridMorro(along, depth);
            float stepA = (morroMeiaLargura * 2f) / 256f;
            float stepD = morroProfundidade / 256f;
            float hx0 = AmostrarGridMorro(along - stepA, depth);
            float hx1 = AmostrarGridMorro(along + stepA, depth);
            float hz0 = AmostrarGridMorro(along, depth - stepD);
            float hz1 = AmostrarGridMorro(along, depth + stepD);

            float dx = (hx1 - hx0) / (2f * stepA);
            float dz = (hz1 - hz0) / (2f * stepD);
            Vector3 normal = new Vector3(-dx, 1f, -dz).normalized;
            float inclinacao = 1f - Mathf.Clamp01(normal.y);

            float nGrande = ValueNoise(px, py, 512, 10, s + 301);
            float nMedio = ValueNoise(px, py, 512, 28, s + 302);
            float nFino = ValueNoise(px, py, 512, 96, s + 303);
            float grao = Hash(px, py, s + 304);

            float estrato = Mathf.Sin(h * 2.1f + nMedio * 4.8f) * 0.5f + 0.5f;
            float distEstrada = DistanciaParaEstrada(along, depth);
            float fatorBeiraEstrada = 1f - Mathf.SmoothStep(3.0f, 7.6f, distEstrada);

            float distEscada = DistanciaParaEscadas(along, depth);
            float fatorTrilha = (depth < morroProfundidade * 0.72f) ? (1f - Mathf.SmoothStep(1.4f, 4.4f, distEscada)) : 0f;

            Color gramaViva = new Color(0.22f + nMedio * 0.11f, 0.44f + nGrande * 0.14f, 0.14f + nFino * 0.06f);
            Color gramaSeca = new Color(0.40f + nFino * 0.08f, 0.46f + nMedio * 0.08f, 0.20f);
            Color corGrama = Color.Lerp(gramaViva, gramaSeca, Mathf.Clamp01(nGrande * 0.62f + inclinacao * 1.15f));

            Color barro = new Color(0.48f + nFino * 0.09f, 0.31f + nMedio * 0.06f, 0.19f + nFino * 0.04f);
            Color cascalho = new Color(0.47f + grao * 0.07f, 0.44f + grao * 0.06f, 0.38f + grao * 0.05f);

            float tomRocha = 0.35f + estrato * 0.14f + nFino * 0.09f + (grao - 0.5f) * 0.05f;
            Color rocha = new Color(tomRocha * 1.05f, tomRocha * 0.99f, tomRocha * 0.91f);
            if (nGrande > 0.55f) rocha = Color.Lerp(rocha, new Color(0.22f, 0.33f, 0.17f), 0.25f);

            float tTerra = Mathf.SmoothStep(0.08f, 0.26f, inclinacao + (nMedio - 0.5f) * 0.12f);
            float tRocha = Mathf.SmoothStep(0.24f, 0.46f, inclinacao + (nGrande - 0.5f) * 0.10f);

            Color finalCol = Color.Lerp(corGrama, barro, Mathf.Clamp01(tTerra * 0.70f + fatorTrilha * 0.48f));
            finalCol = Color.Lerp(finalCol, rocha, tRocha);
            finalCol = Color.Lerp(finalCol, cascalho, fatorBeiraEstrada * 0.65f);

            float luzMicro = Mathf.Clamp(0.84f + (normal.x * 0.22f + normal.z * 0.15f) + (nFino - 0.5f) * 0.14f, 0.66f, 1.20f);
            finalCol *= luzMicro;

            return Cor(finalCol.r, finalCol.g, finalCol.b);
        });
        texTerrenoMorro.wrapMode = TextureWrapMode.Clamp;

        texPedraArrimo = NovaTextura("TexPedraArrimo", 128, (x, y) =>
        {
            int linha = y / 20;
            int xx = x + (linha % 2) * 18;
            int lx = xx % 32;
            int ly = y % 20;
            if (lx < 2 || ly < 2) return Cor(0.30f, 0.29f, 0.28f);
            float hBloco = Hash(xx / 32, linha, s + 310);
            float v = 0.42f + hBloco * 0.20f + (Hash(x, y, s + 311) - 0.5f) * 0.06f;
            return Cor(v * 1.03f, v * 0.99f, v * 0.92f);
        });

        texTijoloFavela = NovaTextura("TexTijoloFavela", 128, (x, y) =>
        {
            int linha = y / 16;
            int xx = x + (linha % 2) * 16;
            if (xx % 32 < 2 || y % 16 < 2) return Cor(0.55f, 0.53f, 0.50f);
            float v = 0.85f + Hash((xx / 32) % 4, linha, s + 312) * 0.25f + (Hash(x, y, s + 313) - 0.5f) * 0.06f;
            return Cor(0.72f * v, 0.35f * v, 0.21f * v);
        });

        texTelhadoZinco = NovaTextura("TexTelhadoZinco", 64, (x, y) =>
        {
            float onda = Mathf.Sin(x * Mathf.PI * 2f / 8f) * 0.09f;
            float baseV = 0.52f + onda + (Hash(x, y, s + 314) - 0.5f) * 0.05f;
            float ferrugem = ValueNoise(x, y, 64, 6, s + 315) > 0.76f ? 0.12f : 0f;
            return Cor(baseV + ferrugem, baseV + ferrugem * 0.35f, baseV - ferrugem * 0.2f);
        });

        texTelhadoBarro = NovaTextura("TexTelhadoBarro", 64, (x, y) =>
        {
            float onda = Mathf.Sin(x * Mathf.PI * 2f / 10f) * 0.10f;
            int juntaY = y % 16 < 2 ? -1 : 0;
            float v = 0.78f + onda + juntaY * 0.14f + (Hash(x, y, s + 320) - 0.5f) * 0.06f;
            return Cor(0.76f * v, 0.36f * v, 0.20f * v);
        });

        texCampinhoGrama = NovaTextura("TexCampinhoMorro", 128, (x, y) =>
        {
            float faixa = ((x / 16) % 2 == 0) ? 0.04f : -0.02f;
            float n = ValueNoise(x, y, 128, 12, s + 316);
            float desgaste = Mathf.Exp(-((x - 64f) * (x - 64f) + (y - 64f) * (y - 64f)) / 1800f) * 0.15f;
            return Cor(0.24f + desgaste * 0.6f + n * 0.08f, 0.50f - desgaste * 0.25f + faixa + n * 0.1f, 0.18f + n * 0.05f);
        });

        texMuralGrafite = NovaTextura("TexMuralMorro", 128, (x, y) =>
        {
            float u = x / 128f;
            float v = y / 128f;
            if (y < 6 || y > 122 || x < 4 || x > 124) return Cor(0.22f, 0.22f, 0.24f);

            Color ceu = Color.Lerp(new Color(0.95f, 0.54f, 0.20f), new Color(0.18f, 0.42f, 0.72f), v);
            float sol = Mathf.Exp(-((u - 0.74f) * (u - 0.74f) + (v - 0.70f) * (v - 0.70f)) * 34f);
            if (sol > 0.32f) ceu = Color.Lerp(ceu, new Color(1.0f, 0.88f, 0.28f), Mathf.Clamp01((sol - 0.32f) * 1.8f));

            float perfilMorro = 0.30f + Mathf.Sin(u * 4.5f) * 0.12f + ValueNoise(x, y, 128, 6, s + 317) * 0.10f;
            if (v < perfilMorro)
            {
                int bloco = (int)(u * 14f);
                float hCasa = perfilMorro - 0.04f - Hash(bloco, 2, s + 318) * 0.08f;
                if (v < hCasa && (int)(v * 20f) % 2 == 0)
                    ceu = Color.HSVToRGB(Hash(bloco, 5, s + 319), 0.72f, 0.82f);
                else
                    ceu = new Color(0.18f, 0.46f, 0.26f);
            }
            if (Mathf.Abs(v - perfilMorro) < 0.018f) ceu *= 0.25f;
            return Cor(ceu.r, ceu.g, ceu.b);
        });
        texMuralGrafite.wrapMode = TextureWrapMode.Clamp;

        texToldoListrado = NovaTextura("TexToldoListrado", 64, (x, y) =>
        {
            bool listra = (x / 8) % 2 == 0;
            return listra ? Cor(0.86f, 0.20f, 0.18f) : Cor(0.95f, 0.93f, 0.88f);
        });
    }

    partial void CalcularDeltaTerrenoMorro(float x, float z, ref float delta)
    {
        if (!LerBoolMorro(true, "criarMorro")) return;
        delta = AlturaTerreno(x, z) - alturaChao;
    }

    partial void ExecutarEtapa3(Transform raiz)
    {
        GarantirDadosMorro();

        if (criarTerrenoEntornoCidade)
            ConstruirTerrenoEntorno(raiz);

        if (!LerBoolMorro(true, "criarMorro")) return;

        GameObject morroRoot = new GameObject("Morro_Favela_Gerado");
        morroRoot.transform.SetParent(raiz, false);
        morroRoot.transform.localPosition = Vector3.zero;

        ConstruirMalhaTerrenoMorro(morroRoot.transform);
        ConstruirMuroArrimoBase(morroRoot.transform);
        ConstruirEstradaSinuosaMorro(morroRoot.transform);
        ConstruirPontoMototaxi(morroRoot.transform);

        if (LerBoolMorro(true, "criarCampinhoMorro", "criarCampinho"))
            ConstruirCampinhoMorro(morroRoot.transform);

        if (LerBoolMorro(true, "criarIgrejinhaMorro", "criarIgrejinha", "criarIgreja"))
            ConstruirIgrejinhaEMirante(morroRoot.transform);

        List<Vector3> pontosPostes = new List<Vector3>();
        List<Vector3> pontosTelhadoCasas = new List<Vector3>();

        ConstruirEscadoesECasasMorro(morroRoot.transform, pontosPostes, pontosTelhadoCasas);

        if (criarVegetacaoERochasMorro)
            ConstruirVegetacaoERochasMorro(morroRoot.transform);

        if (LerBoolMorro(true, "criarFiacaoMorro", "criarFiacao"))
            ConstruirFiacaoMorro(morroRoot.transform, pontosPostes, pontosTelhadoCasas);
    }

    public float AlturaTerreno(float x, float z)
    {
        if (!LerBoolMorro(true, "criarMorro")) return alturaChao;
        GarantirDadosMorro();

        MundoParaMorro(x, z, out float along, out float depth);
        if (depth <= 0f || depth >= morroProfundidade || Mathf.Abs(along) >= morroMeiaLargura)
            return alturaChao;

        return alturaChao + AmostrarGridMorro(along, depth);
    }

    private void ObterDimensoesCidade(out float halfX, out float halfZ, out float passoRealX, out float passoRealZ)
    {
        passoRealX = tamanhoQuadra + larguraRua;
        passoRealZ = tamanhoQuadra + larguraRua;
        float lx = larguraTotal > 0 ? (float)larguraTotal : (quadrasX * tamanhoQuadra + (quadrasX + 1) * larguraRua);
        float lz = comprimentoTotal > 0 ? (float)comprimentoTotal : (quadrasZ * tamanhoQuadra + (quadrasZ + 1) * larguraRua);
        halfX = lx * 0.5f;
        halfZ = lz * 0.5f;
    }

    private void GarantirDadosMorro()
    {
        int ladoLido = LerLadoMorroInt();
        if (morroDadosProntos && morroSeedAtual == seedAleatoria && morroLadoInt == ladoLido)
            return;

        morroSeedAtual = seedAleatoria;
        morroLadoInt = ladoLido;

        ObterDimensoesCidade(out float halfX, out float halfZ, out float passoRealX, out float passoRealZ);

        float alturaInsp = LerFloatMorro(22f, "alturaMorro", "alturaMaximaMorro");
        float profInsp = LerFloatMorro(88f, "profundidadeMorro", "extensaoMorro");

        morroProfundidade = Mathf.Max(profundidadeVisualMorro, profInsp);
        morroAltura = Mathf.Clamp(alturaInsp, 10f, Mathf.Min(alturaMaximaVisualMorro, morroProfundidade * 0.34f));
        morroLarguraEstradaEfetiva = Mathf.Clamp(LerFloatMorro(6.2f, "larguraEstradaMorro"), 4.6f, 8.8f);

        if (morroLadoInt == 0 || morroLadoInt == 1)
        {
            morroBordaBase = halfX;
            morroMeiaLargura = halfZ;
        }
        else
        {
            morroBordaBase = halfZ;
            morroMeiaLargura = halfX;
        }

        int quadrasLado = (morroLadoInt == 0 || morroLadoInt == 1) ? quadrasZ : quadrasX;
        float totalLado = (morroLadoInt == 0 || morroLadoInt == 1) ? halfZ * 2f : halfX * 2f;
        float passoLado = (morroLadoInt == 0 || morroLadoInt == 1) ? passoRealZ : passoRealX;
        int ruaCentralIdx = quadrasLado / 2;
        morroAlongEntrada = -totalLado * 0.5f + larguraRua * 0.5f + ruaCentralIdx * passoLado;
        if (morroLadoInt == 0 || morroLadoInt == 3) morroAlongEntrada = -morroAlongEntrada;

        morroAlongEscadas = new[]
        {
            Mathf.Clamp(morroAlongEntrada - morroMeiaLargura * 0.28f, -morroMeiaLargura * 0.72f, morroMeiaLargura * 0.72f),
            Mathf.Clamp(morroAlongEntrada + morroMeiaLargura * 0.36f, -morroMeiaLargura * 0.72f, morroMeiaLargura * 0.72f)
        };

        morroPlatos.Clear();
        float alongCampinho = Mathf.Clamp(morroAlongEntrada - morroMeiaLargura * 0.42f, -morroMeiaLargura * 0.65f, morroMeiaLargura * 0.65f);
        float alongIgreja = Mathf.Clamp(morroAlongEntrada + morroMeiaLargura * 0.14f, -morroMeiaLargura * 0.48f, morroMeiaLargura * 0.48f);

        float altCampinho = Mathf.Clamp(CalcularRelevoBruto(alongCampinho, morroProfundidade * 0.40f), morroAltura * 0.30f, morroAltura * 0.48f);
        float altIgreja = Mathf.Clamp(CalcularRelevoBruto(alongIgreja, morroProfundidade * 0.72f), morroAltura * 0.62f, morroAltura * 0.84f);

        float halfEntrada = morroLarguraEstradaEfetiva * 0.5f + 0.65f;
        float motoCentroA = morroAlongEntrada + halfEntrada + 4.0f;

        // Platô apenas na baia do Mototáxi (à direita da rua) para não rebaixar a subida da estrada
        morroPlatos.Add(new PlatoMorro
        {
            along = motoCentroA,
            depth = 2.6f,
            halfAlong = 3.8f,
            halfDepth = 2.6f,
            altura = elevacaoAsfalto + 0.04f,
            suavizacao = 2.8f
        });

        if (LerBoolMorro(true, "criarCampinhoMorro", "criarCampinho"))
        {
            morroPlatos.Add(new PlatoMorro
            {
                along = alongCampinho,
                depth = morroProfundidade * 0.40f,
                halfAlong = 13.8f,
                halfDepth = 9.8f,
                altura = altCampinho,
                suavizacao = 7.5f
            });
        }

        if (LerBoolMorro(true, "criarIgrejinhaMorro", "criarIgrejinha", "criarIgreja"))
        {
            morroPlatos.Add(new PlatoMorro
            {
                along = alongIgreja,
                depth = morroProfundidade * 0.72f,
                halfAlong = 13.6f,
                halfDepth = 10.6f,
                altura = altIgreja,
                suavizacao = 8.0f
            });
        }

        // 1) Estrada sinuosa contínua do nível do asfalto até o Mirante
        morroPontosEstrada.Clear();
        int segs = 68;
        float ampS = Mathf.Min(morroMeiaLargura * 0.21f, 20f);
        float dIni = -0.35f;
        float alongChegada = alongIgreja - 6.8f;
        float dFim = morroProfundidade * 0.72f - 9.0f;

        float[] hTemp = new float[segs + 1];
        float[] alongTemp = new float[segs + 1];
        float[] depthTemp = new float[segs + 1];

        for (int i = 0; i <= segs; i++)
        {
            float t = (float)i / segs;
            float depth = Mathf.Lerp(dIni, dFim, t);

            float envoltorioEntrada = Mathf.SmoothStep(0.05f, 0.26f, t);
            float envoltorioChegada = 1f - Mathf.SmoothStep(0.76f, 0.98f, t);
            float faseS = Mathf.Sin(t * Mathf.PI * 2.15f) * envoltorioEntrada * envoltorioChegada * ampS;

            float caminhoBase = Mathf.Lerp(morroAlongEntrada, alongChegada, Mathf.SmoothStep(0.18f, 0.96f, t));
            float along = Mathf.Clamp(caminhoBase + faseS, -morroMeiaLargura * 0.72f, morroMeiaLargura * 0.72f);

            float hLinear = Mathf.Lerp(elevacaoAsfalto + 0.01f, altIgreja + 0.14f, Mathf.SmoothStep(0.02f, 0.96f, t));
            float hNat = CalcularRelevoBruto(along, Mathf.Max(0f, depth));
            float hMix = Mathf.Lerp(hLinear, Mathf.Max(elevacaoAsfalto + 0.01f, hNat), 0.34f);

            alongTemp[i] = along;
            depthTemp[i] = depth;
            hTemp[i] = hMix;
        }

        hTemp[0] = elevacaoAsfalto + 0.01f;
        hTemp[1] = elevacaoAsfalto + 0.02f;
        hTemp[segs] = altIgreja + 0.14f;
        hTemp[segs - 1] = altIgreja + 0.12f;

        for (int pass = 0; pass < 10; pass++)
        {
            for (int i = 2; i < segs - 1; i++)
                hTemp[i] = (hTemp[i - 1] + hTemp[i] * 2f + hTemp[i + 1]) * 0.25f;

            for (int i = 2; i <= segs; i++)
            {
                float distHoriz = Vector2.Distance(
                    new Vector2(alongTemp[i - 1], depthTemp[i - 1]),
                    new Vector2(alongTemp[i], depthTemp[i]));
                float maxSubida = Mathf.Max(0.05f, distHoriz * 0.28f);
                hTemp[i] = Mathf.Clamp(hTemp[i], hTemp[i - 1], hTemp[i - 1] + maxSubida);
            }
            hTemp[segs] = altIgreja + 0.14f;
        }

        for (int i = 0; i <= segs; i++)
            morroPontosEstrada.Add(new Vector3(alongTemp[i], hTemp[i], depthTemp[i]));

        // 2) Perfil pré-calculado dos escadões
        GerarPerfisEscadas();

        // 3) Malha do terreno em alta resolução + rebaixamento travado sob estrada e escadas
        morroGrid = new float[morroGridNX + 1, morroGridNZ + 1];
        for (int ix = 0; ix <= morroGridNX; ix++)
        {
            float u = (float)ix / morroGridNX;
            float along = Mathf.Lerp(-morroMeiaLargura, morroMeiaLargura, u);
            for (int iz = 0; iz <= morroGridNZ; iz++)
            {
                float v = (float)iz / morroGridNZ;
                float depth = Mathf.Lerp(0f, morroProfundidade, v);
                morroGrid[ix, iz] = CalcularAlturaCompleta(along, depth);
            }
        }

        GarantirCamaEstradaEEscadasNoGrid();

        morroDadosProntos = true;
    }

    private void GarantirCamaEstradaEEscadasNoGrid()
    {
        float meiaLargEst = morroLarguraEstradaEfetiva * 0.5f + 1.15f;

        for (int ix = 0; ix <= morroGridNX; ix++)
        {
            float u = (float)ix / morroGridNX;
            float along = Mathf.Lerp(-morroMeiaLargura, morroMeiaLargura, u);
            for (int iz = 0; iz <= morroGridNZ; iz++)
            {
                float v = (float)iz / morroGridNZ;
                float depth = Mathf.Lerp(0f, morroProfundidade, v);

                if (TentarAlturaEstradaEm(along, depth, out float distEst, out float hEst) && distEst < meiaLargEst)
                {
                    float tBorda = Mathf.SmoothStep(morroLarguraEstradaEfetiva * 0.5f + 0.1f, meiaLargEst, distEst);
                    float teto = hEst - Mathf.Lerp(0.38f, 0.24f, tBorda);
                    morroGrid[ix, iz] = Mathf.Min(morroGrid[ix, iz], teto);
                }

                for (int e = 0; e < 2; e++)
                {
                    if (TentarAlturaLista(morroPontosEscadas[e], along, depth, out float distEsc, out float hEsc) && distEsc < 1.95f)
                    {
                        float tetoEsc = hEsc - 0.24f;
                        morroGrid[ix, iz] = Mathf.Min(morroGrid[ix, iz], tetoEsc);
                    }
                }
            }
        }
    }

    private void GerarPerfisEscadas()
    {
        float dIni = -0.35f;
        float dFim = morroProfundidade * 0.66f;
        float passo = 0.60f;
        int qtd = Mathf.CeilToInt((dFim - dIni) / passo) + 1;

        for (int e = 0; e < 2; e++)
        {
            morroPontosEscadas[e].Clear();
            float alongBase = morroAlongEscadas[e];

            float[] hs = new float[qtd];
            float[] als = new float[qtd];
            float[] deps = new float[qtd];

            for (int i = 0; i < qtd; i++)
            {
                float d = Mathf.Min(dIni + i * passo, dFim);
                float a = alongBase + Mathf.Sin(Mathf.Max(0f, d) * 0.10f) * 1.9f;
                float hNat = CalcularRelevoBruto(a, Mathf.Max(0f, d));
                float hBase = i == 0 ? TopoCalcada(false) - 0.02f : Mathf.Max(TopoCalcada(false), hNat);

                if (TentarAlturaEstradaEm(a, d, out float distEst, out float hEst) && distEst < 6.0f)
                {
                    float wEst = 1f - Mathf.SmoothStep(3.1f, 6.0f, distEst);
                    hBase = Mathf.Lerp(hBase, hEst + 0.05f, wEst);
                }

                als[i] = a;
                deps[i] = d;
                hs[i] = hBase;
            }

            hs[0] = TopoCalcada(false) - 0.02f;
            for (int pass = 0; pass < 6; pass++)
            {
                for (int i = 1; i < qtd - 1; i++)
                    hs[i] = (hs[i - 1] + hs[i] * 2f + hs[i + 1]) * 0.25f;
                for (int i = 1; i < qtd; i++)
                    hs[i] = Mathf.Max(hs[i], hs[i - 1]);
            }

            for (int i = 0; i < qtd; i++)
                morroPontosEscadas[e].Add(new Vector3(als[i], hs[i], deps[i]));
        }
    }

    private float CalcularRelevoBruto(float along, float depth)
    {
        float u = Mathf.Clamp01((along + morroMeiaLargura) / (morroMeiaLargura * 2f));
        float v = Mathf.Clamp01(depth / morroProfundidade);

        float perfilProf = v < 0.78f
            ? Mathf.SmoothStep(0.02f, 0.78f, v)
            : 1f - Mathf.SmoothStep(0.78f, 1.0f, v) * 0.42f;

        float bordaLat = Mathf.Clamp01(1f - Mathf.Pow(Mathf.Abs(u * 2f - 1f), 2.8f));

        int nx = Mathf.RoundToInt(u * 128f);
        int nz = Mathf.RoundToInt(v * 128f);
        float fbm = ValueNoise(nx, nz, 128, 4, seedAleatoria + 401) * 0.54f
                  + ValueNoise(nx, nz, 128, 9, seedAleatoria + 402) * 0.30f
                  + ValueNoise(nx, nz, 128, 18, seedAleatoria + 403) * 0.16f;

        float alt = morroAltura * perfilProf * bordaLat * (0.78f + fbm * 0.42f);

        if (intensidadePatamares > 0.01f)
        {
            float degraus = 5.0f;
            float passo = morroAltura / degraus;
            float nivel = alt / passo;
            float frac = nivel - Mathf.Floor(nivel);
            float suave = frac < 0.36f
                ? frac * 0.26f
                : 0.0936f + (frac - 0.36f) / 0.64f * 0.9064f;
            float altTerrace = (Mathf.Floor(nivel) + suave) * passo;
            alt = Mathf.Lerp(alt, altTerrace, intensidadePatamares);
        }

        float transicaoFrente = Mathf.SmoothStep(0f, 3.0f, depth);
        return Mathf.Max(0f, alt * transicaoFrente);
    }

    private float CalcularAlturaCompleta(float along, float depth)
    {
        float h = CalcularRelevoBruto(along, depth);

        // 1) Platôs primeiro
        for (int i = 0; i < morroPlatos.Count; i++)
        {
            PlatoMorro pl = morroPlatos[i];
            float dx = Mathf.Max(0f, Mathf.Abs(along - pl.along) - pl.halfAlong);
            float dz = Mathf.Max(0f, Mathf.Abs(depth - pl.depth) - pl.halfDepth);
            float dist = Mathf.Sqrt(dx * dx + dz * dz);
            if (dist < pl.suavizacao)
            {
                float w = 1f - Mathf.SmoothStep(0f, pl.suavizacao, dist);
                h = Mathf.Lerp(h, pl.altura, w);
            }
        }

        // 2) Escadões nivelam o canal abaixo dos degraus
        for (int e = 0; e < 2; e++)
        {
            if (TentarAlturaLista(morroPontosEscadas[e], along, depth, out float distEsc, out float hEsc))
            {
                if (distEsc < 5.2f)
                {
                    float w = 1f - Mathf.SmoothStep(1.6f, 5.2f, distEsc);
                    h = Mathf.Lerp(h, hEsc - 0.26f, w);
                }
            }
        }

        // 3) Estrada por último para nenhum platô cobrir a pista de grama
        if (TentarAlturaEstradaEm(along, depth, out float distEst, out float hEst))
        {
            float meiaLarg = morroLarguraEstradaEfetiva * 0.5f;
            if (distEst < meiaLarg + 12.0f)
            {
                float w = 1f - Mathf.SmoothStep(meiaLarg + 0.9f, meiaLarg + 12.0f, distEst);
                h = Mathf.Lerp(h, hEst - 0.38f, w);
            }
        }

        // 4) Corte do rio se cruzar o morro
        if (criarRio)
        {
            MorroParaMundo(along, depth, out float wx, out float wz);
            float sRio = eixoRio == EixoRio.LesteOeste_X ? wx : wz;
            float tRio = eixoRio == EixoRio.LesteOeste_X ? wz : wx;
            float distRio = Mathf.Abs(tRio - CentroRioEm(sRio));
            float margem = MeiaLarguraRioEm(sRio) + 3.0f;
            if (distRio < margem + 10f)
            {
                float fRio = 1f - Mathf.SmoothStep(margem, margem + 10f, distRio);
                h = Mathf.Lerp(h, -profundidadeRio - 0.5f, fRio);
            }
        }

        return h;
    }

    private static bool TentarAlturaLista(List<Vector3> pts, float along, float depth, out float distMin, out float altura)
    {
        distMin = float.MaxValue;
        altura = 0f;
        if (pts == null || pts.Count < 2) return false;

        Vector2 p = new Vector2(along, depth);
        for (int i = 0; i < pts.Count - 1; i++)
        {
            Vector3 a = pts[i];
            Vector3 b = pts[i + 1];
            Vector2 pa = new Vector2(a.x, a.z);
            Vector2 pb = new Vector2(b.x, b.z);
            Vector2 ab = pb - pa;
            float lenSq = ab.sqrMagnitude;
            float t = lenSq > 0.0001f ? Mathf.Clamp01(Vector2.Dot(p - pa, ab) / lenSq) : 0f;
            float d = Vector2.Distance(p, pa + ab * t);
            if (d < distMin)
            {
                distMin = d;
                altura = Mathf.Lerp(a.y, b.y, t);
            }
        }
        return true;
    }

    private bool TentarAlturaEstradaEm(float along, float depth, out float distMin, out float altura) =>
        TentarAlturaLista(morroPontosEstrada, along, depth, out distMin, out altura);

    private float AmostrarGridMorro(float along, float depth)
    {
        if (morroGrid == null) return 0f;
        float u = Mathf.Clamp01((along + morroMeiaLargura) / (morroMeiaLargura * 2f));
        float v = Mathf.Clamp01(depth / morroProfundidade);

        float fx = u * morroGridNX;
        float fz = v * morroGridNZ;
        int ix0 = Mathf.Clamp(Mathf.FloorToInt(fx), 0, morroGridNX - 1);
        int iz0 = Mathf.Clamp(Mathf.FloorToInt(fz), 0, morroGridNZ - 1);
        float tx = fx - ix0;
        float tz = fz - iz0;

        float h00 = morroGrid[ix0, iz0];
        float h10 = morroGrid[ix0 + 1, iz0];
        float h01 = morroGrid[ix0, iz0 + 1];
        float h11 = morroGrid[ix0 + 1, iz0 + 1];

        return Mathf.Lerp(Mathf.Lerp(h00, h10, tx), Mathf.Lerp(h01, h11, tx), tz);
    }

    private void AmostrarAreaMinMax(float along, float depth, float meioA, float meioD, out float hMin, out float hMax)
    {
        hMin = float.MaxValue;
        hMax = float.MinValue;
        for (int ia = -1; ia <= 1; ia++)
        {
            for (int id = -1; id <= 1; id++)
            {
                float h = AmostrarGridMorro(along + ia * meioA, depth + id * meioD);
                if (h < hMin) hMin = h;
                if (h > hMax) hMax = h;
            }
        }
    }

    private float DistanciaParaEstrada(float along, float depth)
    {
        TentarAlturaEstradaEm(along, depth, out float distMin, out _);
        return distMin;
    }

    private float DistanciaParaEscadas(float along, float depth)
    {
        float melhor = float.MaxValue;
        for (int e = 0; e < 2; e++)
        {
            if (TentarAlturaLista(morroPontosEscadas[e], along, depth, out float d, out _))
                melhor = Mathf.Min(melhor, d);
        }
        return melhor;
    }

    private void ConstruirMalhaTerrenoMorro(Transform pai)
    {
        int nx = morroGridNX;
        int nz = morroGridNZ;
        int totalVerts = (nx + 1) * (nz + 1);

        Vector3[] verts = new Vector3[totalVerts];
        Vector2[] uvs = new Vector2[totalVerts];
        int[] tris = new int[nx * nz * 6];

        for (int iz = 0; iz <= nz; iz++)
        {
            float v = (float)iz / nz;
            float depth = Mathf.Lerp(0f, morroProfundidade, v);
            for (int ix = 0; ix <= nx; ix++)
            {
                float u = (float)ix / nx;
                float along = Mathf.Lerp(-morroMeiaLargura, morroMeiaLargura, u);
                float h = morroGrid[ix, iz];

                MorroParaMundo(along, depth, out float wx, out float wz);
                int idx = iz * (nx + 1) + ix;
                verts[idx] = new Vector3(wx, alturaChao + h, wz);
                uvs[idx] = new Vector2(u, v);
            }
        }

        int ti = 0;
        for (int iz = 0; iz < nz; iz++)
        {
            for (int ix = 0; ix < nx; ix++)
            {
                int i00 = iz * (nx + 1) + ix;
                int i10 = i00 + 1;
                int i01 = i00 + (nx + 1);
                int i11 = i01 + 1;

                tris[ti++] = i00; tris[ti++] = i01; tris[ti++] = i11;
                tris[ti++] = i00; tris[ti++] = i11; tris[ti++] = i10;
            }
        }

        Mesh mesh = new Mesh { name = "Malha_Terreno_Morro" };
        if (totalVerts > 65000) mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
        mesh.vertices = verts;
        mesh.uv = uvs;
        mesh.triangles = tris;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        meshesGerados.Add(mesh);

        GameObject obj = new GameObject("Terreno_Morro");
        obj.transform.SetParent(pai, false);
        obj.AddComponent<MeshFilter>().sharedMesh = mesh;

        Material mat = ObterMaterial("morro_terreno_splat_" + seedAleatoria,
            texTerrenoMorro != null ? Color.white : new Color(0.32f, 0.50f, 0.24f),
            texTerrenoMorro, Vector2.one, 0.04f, false);
        obj.AddComponent<MeshRenderer>().sharedMaterial = mat;

        MeshCollider mc = obj.AddComponent<MeshCollider>();
        mc.sharedMesh = mesh;
        RegistrarObjetoDinamico(obj);
    }

    private void ConstruirTerrenoEntorno(Transform pai)
    {
        ObterDimensoesCidade(out float halfX, out float halfZ, out _, out _);
        float larguraFaixa = 64f;
        float folga = -0.20f;
        bool temMorro = LerBoolMorro(true, "criarMorro");
        float extMorro = temMorro ? Mathf.Max(larguraFaixa, morroProfundidade + 12f) : larguraFaixa;

        float extLeste = (temMorro && morroLadoInt == 0) ? extMorro : larguraFaixa;
        float extOeste = (temMorro && morroLadoInt == 1) ? extMorro : larguraFaixa;

        GameObject entorno = new GameObject("Terreno_Entorno");
        entorno.transform.SetParent(pai, false);

        if (!temMorro || morroLadoInt != 2)
            CriarFaixaEntorno(entorno.transform, "Entorno_Norte", -halfX - extOeste, halfX + extLeste, halfZ + folga, halfZ + folga + larguraFaixa);
        if (!temMorro || morroLadoInt != 3)
            CriarFaixaEntorno(entorno.transform, "Entorno_Sul", -halfX - extOeste, halfX + extLeste, -halfZ - folga - larguraFaixa, -halfZ - folga);
        if (!temMorro || morroLadoInt != 0)
            CriarFaixaEntorno(entorno.transform, "Entorno_Leste", halfX + folga, halfX + folga + larguraFaixa, -halfZ - 0.5f, halfZ + 0.5f);
        if (!temMorro || morroLadoInt != 1)
            CriarFaixaEntorno(entorno.transform, "Entorno_Oeste", -halfX - folga - larguraFaixa, -halfX - folga, -halfZ - 0.5f, halfZ + 0.5f);
    }

    private void CriarFaixaEntorno(Transform pai, string nome, float minX, float maxX, float minZ, float maxZ)
    {
        int nx = 44;
        int nz = 32;
        Vector3[] verts = new Vector3[(nx + 1) * (nz + 1)];
        Vector2[] uvs = new Vector2[(nx + 1) * (nz + 1)];
        int[] tris = new int[nx * nz * 6];

        ObterDimensoesCidade(out float halfX, out float halfZ, out _, out _);
        bool temRio = LerBoolMorro(true, "criarRio");

        for (int iz = 0; iz <= nz; iz++)
        {
            float tz = (float)iz / nz;
            float z = Mathf.Lerp(minZ, maxZ, tz);
            for (int ix = 0; ix <= nx; ix++)
            {
                float tx = (float)ix / nx;
                float x = Mathf.Lerp(minX, maxX, tx);

                float y = CalcularAlturaEntorno(x, z, halfX, halfZ, temRio);
                int idx = iz * (nx + 1) + ix;
                verts[idx] = new Vector3(x, y, z);
                uvs[idx] = new Vector2(x / 6f, z / 6f);
            }
        }

        int ti = 0;
        for (int iz = 0; iz < nz; iz++)
        {
            for (int ix = 0; ix < nx; ix++)
            {
                int i00 = iz * (nx + 1) + ix;
                int i10 = i00 + 1;
                int i01 = i00 + (nx + 1);
                int i11 = i01 + 1;
                tris[ti++] = i00; tris[ti++] = i01; tris[ti++] = i11;
                tris[ti++] = i00; tris[ti++] = i11; tris[ti++] = i10;
            }
        }

        Mesh mesh = new Mesh { name = "Malha_" + nome };
        mesh.vertices = verts;
        mesh.uv = uvs;
        mesh.triangles = tris;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        meshesGerados.Add(mesh);

        GameObject obj = new GameObject(nome);
        obj.transform.SetParent(pai, false);
        obj.AddComponent<MeshFilter>().sharedMesh = mesh;
        obj.AddComponent<MeshRenderer>().sharedMaterial = MatGrama();
        obj.AddComponent<MeshCollider>().sharedMesh = mesh;
        RegistrarObjetoDinamico(obj);

        int qtdDetalhes = presetQualidade == PresetQualidade.Leve ? 10 : (presetQualidade == PresetQualidade.Medio ? 18 : 28);
        for (int i = 0; i < qtdDetalhes; i++)
        {
            float ax = Mathf.Lerp(minX + 5f, maxX - 5f, Random.value);
            float az = Mathf.Lerp(minZ + 5f, maxZ - 5f, Random.value);

            if (temRio)
            {
                float sRio = eixoRio == EixoRio.LesteOeste_X ? ax : az;
                float tRio = eixoRio == EixoRio.LesteOeste_X ? az : ax;
                if (Mathf.Abs(tRio - CentroRioEm(sRio)) < MeiaLarguraRioEm(sRio) + 8f) continue;
            }

            float dx = Mathf.Max(0f, Mathf.Abs(ax) - halfX);
            float dz = Mathf.Max(0f, Mathf.Abs(az) - halfZ);
            if (Mathf.Sqrt(dx * dx + dz * dz) < 3.5f) continue;

            float ay = CalcularAlturaEntorno(ax, az, halfX, halfZ, temRio);
            float r = Random.value;
            if (r < 0.50f)
                CriarArvoreMorro(pai, new Vector3(ax, ay - 0.2f, az), Random.Range(0.95f, 1.45f), i);
            else if (r < 0.78f)
                CriarMoitaCapimMorro(pai, new Vector3(ax, ay - 0.05f, az), Random.Range(0.8f, 1.3f), i);
            else
                CriarRochaMorro(pai, new Vector3(ax, ay - 0.2f, az), Random.Range(0.9f, 1.9f), seedAleatoria + i * 7);
        }
    }

    private float CalcularAlturaEntorno(float x, float z, float halfX, float halfZ, bool temRio)
    {
        float dx = Mathf.Max(0f, Mathf.Abs(x) - halfX);
        float dz = Mathf.Max(0f, Mathf.Abs(z) - halfZ);
        float distCidade = Mathf.Sqrt(dx * dx + dz * dz);

        if (LerBoolMorro(true, "criarMorro"))
        {
            MundoParaMorro(x, z, out float alongM, out float depthM);
            if (depthM >= 0f && depthM <= morroProfundidade)
            {
                float distMorroLat = Mathf.Max(0f, Mathf.Abs(alongM) - morroMeiaLargura);
                distCidade = Mathf.Min(distCidade, distMorroLat);
            }
        }

        float n1 = ValueNoise(Mathf.Abs(Mathf.RoundToInt(x * 1.3f)), Mathf.Abs(Mathf.RoundToInt(z * 1.3f)), 128, 6, seedAleatoria + 510);
        float n2 = ValueNoise(Mathf.Abs(Mathf.RoundToInt(x * 3.1f)), Mathf.Abs(Mathf.RoundToInt(z * 3.1f)), 128, 14, seedAleatoria + 511);

        float subida = Mathf.SmoothStep(1.5f, 44f, distCidade);
        float y = alturaChao - 0.02f + subida * (1.6f + n1 * 6.5f + n2 * 1.8f);

        if (temRio)
        {
            float sRio = eixoRio == EixoRio.LesteOeste_X ? x : z;
            float tRio = eixoRio == EixoRio.LesteOeste_X ? z : x;
            float distRio = Mathf.Abs(tRio - CentroRioEm(sRio));
            float margemRio = MeiaLarguraRioEm(sRio) + 3.0f;
            if (distRio < margemRio + 12f)
            {
                float fRio = 1f - Mathf.SmoothStep(margemRio, margemRio + 12f, distRio);
                y = Mathf.Lerp(y, alturaChao - profundidadeRio - 0.8f, fRio);
            }
        }
        return y;
    }

    private void ConstruirMuroArrimoBase(Transform pai)
    {
        GameObject muroGrupo = new GameObject("Muro_Arrimo_Base");
        muroGrupo.transform.SetParent(pai, false);

        Material matPedra = ObterMaterial("morro_pedra_arrimo", Color.white, texPedraArrimo, Vector2.one, 0.05f, false);
        Material matConcreto = MatCor(new Color(0.56f, 0.56f, 0.55f), 0.08f);
        Material matBranco = MatCor(new Color(0.90f, 0.90f, 0.90f), 0.1f);
        Quaternion rotBase = MorroRotacaoBase();

        for (int f = -3; f <= 3; f++)
        {
            MorroParaMundo(morroAlongEntrada + f * 0.85f, -2.5f, out float fx, out float fz);
            GameObject fxObj = new GameObject("Faixa_Pedestre_Morro");
            fxObj.transform.SetParent(muroGrupo.transform, false);
            fxObj.transform.position = new Vector3(fx, TopoAsfalto + 0.015f, fz);
            fxObj.transform.rotation = rotBase;
            CriarCaixa("Listra", fxObj.transform, Vector3.zero, new Vector3(0.42f, 0.02f, 2.2f), matBranco, 1f, 1f, false, false);
        }

        float halfEntrada = morroLarguraEstradaEfetiva * 0.5f + 0.65f;
        for (int lado = -1; lado <= 1; lado += 2)
        {
            float aAla = morroAlongEntrada + lado * (halfEntrada + 0.35f);
            MorroParaMundo(aAla, 2.2f, out float ax, out float az);
            GameObject ala = new GameObject($"Muro_Ala_Entrada_{(lado < 0 ? "E" : "D")}");
            ala.transform.SetParent(muroGrupo.transform, false);
            ala.transform.position = new Vector3(ax, alturaChao + 0.45f, az);
            ala.transform.rotation = rotBase;
            CriarCaixa("Pedra", ala.transform, Vector3.zero, new Vector3(0.95f, 2.4f, 4.4f), matPedra, 2f, 2f, false, true);
        }

        float motoCentroA = morroAlongEntrada + halfEntrada + 4.0f;
        float motoMeiaA = 3.8f;
        MorroParaMundo(motoCentroA, 5.4f, out float mBackX, out float mBackZ);
        GameObject muroMoto = new GameObject("Muro_Fundo_Mototaxi");
        muroMoto.transform.SetParent(muroGrupo.transform, false);
        muroMoto.transform.position = new Vector3(mBackX, alturaChao + 1.0f, mBackZ);
        muroMoto.transform.rotation = rotBase;
        CriarCaixa("Parede_Pedra", muroMoto.transform, Vector3.zero, new Vector3(motoMeiaA * 2f + 1.4f, 3.6f, 1.1f), matPedra, 2.2f, 2.2f, false, true);
        CriarCaixa("Chapim_Concreto", muroMoto.transform, new Vector3(0f, 1.85f, 0f), new Vector3(motoMeiaA * 2f + 1.6f, 0.18f, 1.25f), matConcreto, 1f, 1f, false, false);

        float passoMuro = 2.0f;
        int muralColocado = 0;

        for (float a = -morroMeiaLargura * 0.85f; a < morroMeiaLargura * 0.85f; a += passoMuro)
        {
            float centroA = a + passoMuro * 0.5f;

            if (Mathf.Abs(centroA - morroAlongEntrada) < halfEntrada)
                continue;

            bool ehBaiaMoto = Mathf.Abs(centroA - motoCentroA) < motoMeiaA;

            bool aberturaEscada = false;
            for (int e = 0; e < morroAlongEscadas.Length; e++)
            {
                if (Mathf.Abs(centroA - morroAlongEscadas[e]) < 1.75f)
                {
                    aberturaEscada = true;
                    break;
                }
            }

            MorroParaMundo(centroA, -0.85f, out float cx, out float cz);
            GameObject calcSeg = new GameObject("Calcada_Morro_Base");
            calcSeg.transform.SetParent(muroGrupo.transform, false);
            calcSeg.transform.position = new Vector3(cx, TopoAsfalto + 0.06f, cz);
            calcSeg.transform.rotation = rotBase;
            CriarCaixa("Calcada_Piso", calcSeg.transform, Vector3.zero, new Vector3(passoMuro + 0.12f, 0.24f, 2.2f),
                MatCalcada(), metrosPorTexturaCalcada, metrosPorTexturaCalcada, false, true);

            if (aberturaEscada || ehBaiaMoto)
                continue;

            if (Mathf.Abs(Mathf.RoundToInt(centroA)) % 24 < 2)
            {
                CriarCaixa("Banco_Base", calcSeg.transform, new Vector3(0f, 0.34f, -0.35f),
                    new Vector3(1.6f, 0.42f, 0.48f), MatCor(new Color(0.46f, 0.30f, 0.18f), 0.1f), 1f, 1f, false, true);
            }

            float altTerreno = AmostrarGridMorro(centroA, 2.4f);
            float topoMuro = Mathf.Clamp(altTerreno + 0.75f, 1.9f, 4.4f);
            float baseMuro = -1.2f;
            float altTotal = topoMuro - baseMuro;

            MorroParaMundo(centroA, 0.45f, out float mx, out float mz);
            GameObject seg = new GameObject("Muro_Seg");
            seg.transform.SetParent(muroGrupo.transform, false);
            seg.transform.position = new Vector3(mx, alturaChao + (baseMuro + topoMuro) * 0.5f, mz);
            seg.transform.rotation = rotBase;

            CriarCaixa("Parede_Pedra", seg.transform, Vector3.zero, new Vector3(passoMuro + 0.10f, altTotal, 1.35f),
                matPedra, 2.2f, 2.2f, false, true);
            CriarCaixa("Chapim_Concreto", seg.transform, new Vector3(0f, altTotal * 0.5f + 0.08f, 0f),
                new Vector3(passoMuro + 0.14f, 0.18f, 1.48f), matConcreto, 1f, 1f, false, false);

            if (Mathf.Abs(Mathf.RoundToInt(centroA)) % 8 < 2)
            {
                CriarCaixa("Contraforte", seg.transform, new Vector3(-passoMuro * 0.42f, 0f, -0.18f),
                    new Vector3(0.48f, altTotal + 0.2f, 1.65f), matConcreto, 1f, 1f, false, true);
                CriarCilindro("Dreno_1", seg.transform, new Vector3(0.2f, -0.15f, -0.72f), 0.06f, 0.24f, matConcreto, false, 8)
                    .transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            }

            if (muralColocado < 2 && Mathf.Abs(centroA - morroAlongEntrada) > 12f && Mathf.Abs(centroA - morroAlongEntrada) < 38f
                && Mathf.Abs(Mathf.RoundToInt(centroA)) % 10 < 2)
            {
                float wMural = 5.4f;
                float hMural = Mathf.Min(2.4f, topoMuro * 0.72f);
                Material matMural = ObterMaterial("morro_mural_grafite", Color.white, texMuralGrafite, Vector2.one, 0.08f, false);
                CriarCaixa("Mural_Grafite_Parede", seg.transform, new Vector3(0f, 0.35f, -0.72f),
                    new Vector3(wMural, hMural, 0.08f), matMural, wMural, hMural, false, false);
                muralColocado++;
            }
        }
    }

    private void ConstruirEstradaSinuosaMorro(Transform pai)
    {
        if (morroPontosEstrada.Count < 2) return;

        GameObject estradaGrupo = new GameObject("Estrada_Sinuosa_Morro");
        estradaGrupo.transform.SetParent(pai, false);

        Material matAsfalto = MatAsfalto();
        Material matPedra = ObterMaterial("morro_pedra_arrimo", Color.white, texPedraArrimo, Vector2.one, 0.05f, false);
        Material matConcreto = MatCor(new Color(0.54f, 0.54f, 0.52f), 0.1f);
        Material matFaixa = MatCor(new Color(0.92f, 0.82f, 0.26f), 0.12f);
        Material matBranco = MatCor(new Color(0.88f, 0.88f, 0.88f), 0.12f);
        Material matAco = MatCor(new Color(0.62f, 0.65f, 0.68f), 0.45f);

        int n = morroPontosEstrada.Count;
        float[] widths = new float[n];
        Vector3[] centros = new Vector3[n];
        Vector3[] rights = new Vector3[n];
        float[] yBaseAterro = new float[n];

        for (int i = 0; i < n; i++)
        {
            Vector3 p = morroPontosEstrada[i];
            MorroParaMundo(p.x, p.z, out float wx, out float wz);
            centros[i] = new Vector3(wx, alturaChao + p.y, wz);

            float t = (float)i / (n - 1);
            float alargEntrada = t < 0.08f ? Mathf.Lerp(1.2f, 0f, t / 0.08f) : 0f;
            float alargTopo = t > 0.90f ? Mathf.Lerp(0f, 1.4f, (t - 0.90f) / 0.10f) : 0f;
            widths[i] = morroLarguraEstradaEfetiva + alargEntrada + alargTopo;
        }

        for (int i = 0; i < n; i++)
        {
            Vector3 pPrev = centros[Mathf.Max(0, i - 1)];
            Vector3 pNext = centros[Mathf.Min(n - 1, i + 1)];
            Vector3 tan = pNext - pPrev;
            tan.y = 0f;
            if (tan.sqrMagnitude < 0.0001f) tan = MorroRotacaoBase() * Vector3.forward;
            tan.Normalize();
            rights[i] = Vector3.Cross(Vector3.up, tan).normalized;

            Vector3 pM = morroPontosEstrada[i];
            float hwBot = widths[i] * 0.5f + 2.2f;
            MorroParaMundo(pM.x, pM.z, out float wxC, out float wzC);
            Vector3 wL = new Vector3(wxC, 0f, wzC) - rights[i] * hwBot;
            Vector3 wR = new Vector3(wxC, 0f, wzC) + rights[i] * hwBot;

            MundoParaMorro(wL.x, wL.z, out float aL, out float dL);
            MundoParaMorro(wR.x, wR.z, out float aR, out float dR);
            float hL = AmostrarGridMorro(aL, Mathf.Clamp(dL, 0f, morroProfundidade));
            float hC = AmostrarGridMorro(pM.x, Mathf.Clamp(pM.z, 0f, morroProfundidade));
            float hR = AmostrarGridMorro(aR, Mathf.Clamp(dR, 0f, morroProfundidade));

            float hMinTerreno = Mathf.Min(hC, Mathf.Min(hL, hR));
            yBaseAterro[i] = Mathf.Min(alturaChao - 2.2f, alturaChao + hMinTerreno - 3.8f);
        }

        // 1) Aterro trapezoidal de pedra
        Mesh meshAterro = CriarMalhaAterroEstrada(centros, rights, widths, yBaseAterro);
        GameObject goAterro = new GameObject("Aterro_Contencao_Morro");
        goAterro.transform.SetParent(estradaGrupo.transform, false);
        goAterro.AddComponent<MeshFilter>().sharedMesh = meshAterro;
        goAterro.AddComponent<MeshRenderer>().sharedMaterial = matPedra;
        goAterro.AddComponent<MeshCollider>().sharedMesh = meshAterro;
        RegistrarObjetoDinamico(goAterro);

        // 2) Pista asfáltica contínua sempre acima do terreno
        Mesh meshPista = CriarMalhaPistaEstrada(centros, rights, widths, 0.015f);
        GameObject goPista = new GameObject("Asfalto_Estrada_Morro");
        goPista.transform.SetParent(estradaGrupo.transform, false);
        goPista.AddComponent<MeshFilter>().sharedMesh = meshPista;
        goPista.AddComponent<MeshRenderer>().sharedMaterial = matAsfalto;
        goPista.AddComponent<MeshCollider>().sharedMesh = meshPista;
        RegistrarObjetoDinamico(goPista);

        // 3) Meio-fio contínuo
        for (int lado = -1; lado <= 1; lado += 2)
        {
            Mesh meshMeioFio = CriarMalhaMeioFioEstrada(centros, rights, widths, lado);
            GameObject goMeioFio = new GameObject(lado < 0 ? "MeioFio_Morro_Esq" : "MeioFio_Morro_Dir");
            goMeioFio.transform.SetParent(estradaGrupo.transform, false);
            goMeioFio.AddComponent<MeshFilter>().sharedMesh = meshMeioFio;
            goMeioFio.AddComponent<MeshRenderer>().sharedMaterial = matConcreto;
            goMeioFio.AddComponent<MeshCollider>().sharedMesh = meshMeioFio;
            RegistrarObjetoDinamico(goMeioFio);
        }

        // 4) Faixas e guard-rail
        for (int i = 0; i < n - 1; i++)
        {
            Vector3 wA = centros[i];
            Vector3 wB = centros[i + 1];
            Vector3 dir = wB - wA;
            float comp = dir.magnitude;
            if (comp < 0.05f) continue;

            float hw = (widths[i] + widths[i + 1]) * 0.25f;
            Quaternion rotSeg = Quaternion.LookRotation(dir.normalized, Vector3.up);
            Vector3 meio = (wA + wB) * 0.5f;

            if (i % 2 == 0)
            {
                GameObject fx = CriarCaixa("Faixa_Amarela_Morro", estradaGrupo.transform, meio + Vector3.up * 0.025f,
                    new Vector3(0.16f, 0.02f, comp * 0.65f), matFaixa, 1f, 1f, false, false);
                fx.transform.rotation = rotSeg;
            }

            for (int lado = -1; lado <= 1; lado += 2)
            {
                Vector3 bordaPos = meio + rights[i] * (lado * (hw - 0.24f)) + Vector3.up * 0.022f;
                GameObject bd = CriarCaixa(lado < 0 ? "Borda_Esq" : "Borda_Dir", estradaGrupo.transform, bordaPos,
                    new Vector3(0.09f, 0.015f, comp + 0.04f), matBranco, 1f, 1f, false, false);
                bd.transform.rotation = rotSeg;

                if (i >= 5 && i < n - 3)
                {
                    Vector3 pCheck = meio + rights[i] * (lado * (hw + 1.4f));
                    MundoParaMorro(pCheck.x, pCheck.z, out float aC, out float dC);
                    float hBorda = alturaChao + AmostrarGridMorro(aC, Mathf.Clamp(dC, 0f, morroProfundidade));
                    if (meio.y - hBorda > 0.35f)
                    {
                        Vector3 gPos = meio + rights[i] * (lado * (hw + 0.18f));
                        GameObject gr = CriarCaixa("GuardRail_Lamina", estradaGrupo.transform, gPos + Vector3.up * 0.58f,
                            new Vector3(0.08f, 0.20f, comp + 0.06f), matAco, 1f, 1f, false, true);
                        gr.transform.rotation = rotSeg;

                        if (i % 2 == 0)
                        {
                            CriarCaixa("GuardRail_Poste", estradaGrupo.transform, gPos + Vector3.up * 0.34f,
                                new Vector3(0.10f, 0.64f, 0.10f), matConcreto, 1f, 1f, false, false);
                        }
                    }
                }
            }
        }
    }

    private Mesh CriarMalhaPistaEstrada(Vector3[] centros, Vector3[] rights, float[] widths, float espOffset)
    {
        int n = centros.Length;
        List<Vector3> verts = new List<Vector3>();
        List<Vector2> uvs = new List<Vector2>();
        List<int> tris = new List<int>();

        float distAcum = 0f;
        for (int i = 0; i < n - 1; i++)
        {
            float segComp = Vector3.Distance(centros[i], centros[i + 1]);
            float v0 = distAcum / Mathf.Max(1f, metrosPorTexturaAsfalto);
            float v1 = (distAcum + segComp) / Mathf.Max(1f, metrosPorTexturaAsfalto);
            distAcum += segComp;

            float hw0 = widths[i] * 0.5f;
            float hw1 = widths[i + 1] * 0.5f;

            Vector3 lt0 = centros[i] - rights[i] * hw0 + Vector3.up * espOffset;
            Vector3 rt0 = centros[i] + rights[i] * hw0 + Vector3.up * espOffset;
            Vector3 lt1 = centros[i + 1] - rights[i + 1] * hw1 + Vector3.up * espOffset;
            Vector3 rt1 = centros[i + 1] + rights[i + 1] * hw1 + Vector3.up * espOffset;

            Vector3 lb0 = lt0 - Vector3.up * 0.24f;
            Vector3 rb0 = rt0 - Vector3.up * 0.24f;
            Vector3 lb1 = lt1 - Vector3.up * 0.24f;
            Vector3 rb1 = rt1 - Vector3.up * 0.24f;

            float uMax0 = widths[i] / Mathf.Max(1f, metrosPorTexturaAsfalto);
            float uMax1 = widths[i + 1] / Mathf.Max(1f, metrosPorTexturaAsfalto);

            AdicionarQuadEstrada(verts, uvs, tris, lt0, lt1, rt1, rt0,
                new Vector2(0f, v0), new Vector2(0f, v1), new Vector2(uMax1, v1), new Vector2(uMax0, v0));
            AdicionarQuadEstrada(verts, uvs, tris, lt0, lb0, lb1, lt1,
                new Vector2(0f, v0), new Vector2(0.1f, v0), new Vector2(0.1f, v1), new Vector2(0f, v1));
            AdicionarQuadEstrada(verts, uvs, tris, rt0, rt1, rb1, rb0,
                new Vector2(0f, v0), new Vector2(0f, v1), new Vector2(0.1f, v1), new Vector2(0.1f, v0));
        }

        Mesh mesh = new Mesh { name = "Malha_Pista_Estrada_Morro" };
        mesh.SetVertices(verts);
        mesh.SetUVs(0, uvs);
        mesh.SetTriangles(tris, 0);
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        meshesGerados.Add(mesh);
        return mesh;
    }

    private Mesh CriarMalhaAterroEstrada(Vector3[] centros, Vector3[] rights, float[] widths, float[] yBase)
    {
        int n = centros.Length;
        List<Vector3> verts = new List<Vector3>();
        List<Vector2> uvs = new List<Vector2>();
        List<int> tris = new List<int>();

        float distAcum = 0f;
        for (int i = 0; i < n - 1; i++)
        {
            float segComp = Vector3.Distance(centros[i], centros[i + 1]);
            float v0 = distAcum * 0.45f;
            float v1 = (distAcum + segComp) * 0.45f;
            distAcum += segComp;

            float hwTop0 = widths[i] * 0.5f + 0.42f;
            float hwTop1 = widths[i + 1] * 0.5f + 0.42f;
            float hwBot0 = hwTop0 + 2.1f;
            float hwBot1 = hwTop1 + 2.1f;

            Vector3 lt0 = centros[i] - rights[i] * hwTop0 - Vector3.up * 0.04f;
            Vector3 rt0 = centros[i] + rights[i] * hwTop0 - Vector3.up * 0.04f;
            Vector3 lt1 = centros[i + 1] - rights[i + 1] * hwTop1 - Vector3.up * 0.04f;
            Vector3 rt1 = centros[i + 1] + rights[i + 1] * hwTop1 - Vector3.up * 0.04f;

            Vector3 lb0 = centros[i] - rights[i] * hwBot0; lb0.y = yBase[i];
            Vector3 rb0 = centros[i] + rights[i] * hwBot0; rb0.y = yBase[i];
            Vector3 lb1 = centros[i + 1] - rights[i + 1] * hwBot1; lb1.y = yBase[i + 1];
            Vector3 rb1 = centros[i + 1] + rights[i + 1] * hwBot1; rb1.y = yBase[i + 1];

            float hE = Mathf.Max(1f, lt0.y - lb0.y) * 0.45f;
            float hD = Mathf.Max(1f, rt0.y - rb0.y) * 0.45f;

            AdicionarQuadEstrada(verts, uvs, tris, lt0, lt1, rt1, rt0,
                new Vector2(0f, v0), new Vector2(0f, v1), new Vector2(1f, v1), new Vector2(1f, v0));
            AdicionarQuadEstrada(verts, uvs, tris, lt0, lb0, lb1, lt1,
                new Vector2(v0, hE), new Vector2(v0, 0f), new Vector2(v1, 0f), new Vector2(v1, hE));
            AdicionarQuadEstrada(verts, uvs, tris, rt0, rt1, rb1, rb0,
                new Vector2(v0, hD), new Vector2(v1, hD), new Vector2(v1, 0f), new Vector2(v0, 0f));

            if (i == 0)
            {
                AdicionarQuadEstrada(verts, uvs, tris, lt0, rt0, rb0, lb0,
                    new Vector2(0f, hE), new Vector2(1f, hD), new Vector2(1f, 0f), new Vector2(0f, 0f));
            }
            if (i == n - 2)
            {
                AdicionarQuadEstrada(verts, uvs, tris, lt1, lb1, rb1, rt1,
                    new Vector2(0f, hE), new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(1f, hD));
            }
        }

        Mesh mesh = new Mesh { name = "Malha_Aterro_Estrada_Morro" };
        mesh.SetVertices(verts);
        mesh.SetUVs(0, uvs);
        mesh.SetTriangles(tris, 0);
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        meshesGerados.Add(mesh);
        return mesh;
    }

    private Mesh CriarMalhaMeioFioEstrada(Vector3[] centros, Vector3[] rights, float[] widths, int lado)
    {
        int n = centros.Length;
        List<Vector3> verts = new List<Vector3>();
        List<Vector2> uvs = new List<Vector2>();
        List<int> tris = new List<int>();

        float largCurb = 0.34f;
        float distAcum = 0f;

        for (int i = 0; i < n - 1; i++)
        {
            float segComp = Vector3.Distance(centros[i], centros[i + 1]);
            float v0 = distAcum * 0.5f;
            float v1 = (distAcum + segComp) * 0.5f;
            distAcum += segComp;

            float offIn0 = widths[i] * 0.5f;
            float offOut0 = offIn0 + largCurb;
            float offIn1 = widths[i + 1] * 0.5f;
            float offOut1 = offIn1 + largCurb;

            float in0 = lado < 0 ? -offOut0 : offIn0;
            float out0 = lado < 0 ? -offIn0 : offOut0;
            float in1 = lado < 0 ? -offOut1 : offIn1;
            float out1 = lado < 0 ? -offIn1 : offOut1;

            Vector3 lt0 = centros[i] + rights[i] * in0 + Vector3.up * 0.14f;
            Vector3 rt0 = centros[i] + rights[i] * out0 + Vector3.up * 0.14f;
            Vector3 lt1 = centros[i + 1] + rights[i + 1] * in1 + Vector3.up * 0.14f;
            Vector3 rt1 = centros[i + 1] + rights[i + 1] * out1 + Vector3.up * 0.14f;

            Vector3 lb0 = lt0 - Vector3.up * 0.24f;
            Vector3 rb0 = rt0 - Vector3.up * 0.24f;
            Vector3 lb1 = lt1 - Vector3.up * 0.24f;
            Vector3 rb1 = rt1 - Vector3.up * 0.24f;

            AdicionarQuadEstrada(verts, uvs, tris, lt0, lt1, rt1, rt0,
                new Vector2(0f, v0), new Vector2(0f, v1), new Vector2(0.2f, v1), new Vector2(0.2f, v0));
            AdicionarQuadEstrada(verts, uvs, tris, lt0, lb0, lb1, lt1,
                new Vector2(0f, v0), new Vector2(0.2f, v0), new Vector2(0.2f, v1), new Vector2(0f, v1));
            AdicionarQuadEstrada(verts, uvs, tris, rt0, rt1, rb1, rb0,
                new Vector2(0f, v0), new Vector2(0f, v1), new Vector2(0.2f, v1), new Vector2(0.2f, v0));
        }

        Mesh mesh = new Mesh { name = "Malha_MeioFio_Morro_" + (lado < 0 ? "E" : "D") };
        mesh.SetVertices(verts);
        mesh.SetUVs(0, uvs);
        mesh.SetTriangles(tris, 0);
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        meshesGerados.Add(mesh);
        return mesh;
    }

    private static void AdicionarQuadEstrada(List<Vector3> v, List<Vector2> uv, List<int> tr,
        Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector2 uva, Vector2 uvb, Vector2 uvc, Vector2 uvd)
    {
        int i0 = v.Count;
        v.Add(a); v.Add(b); v.Add(c); v.Add(d);
        uv.Add(uva); uv.Add(uvb); uv.Add(uvc); uv.Add(uvd);
        tr.Add(i0); tr.Add(i0 + 1); tr.Add(i0 + 2);
        tr.Add(i0); tr.Add(i0 + 2); tr.Add(i0 + 3);
    }

    private void ConstruirPontoMototaxi(Transform pai)
    {
        float halfEntrada = morroLarguraEstradaEfetiva * 0.5f + 0.65f;
        float along = morroAlongEntrada + halfEntrada + 4.0f;
        float depth = 2.5f;
        float yBase = TopoAsfalto + 0.14f;
        MorroParaMundo(along, depth, out float wx, out float wz);

        GameObject ponto = new GameObject("Ponto_Mototaxi_Morro");
        ponto.transform.SetParent(pai, false);
        ponto.transform.position = new Vector3(wx, yBase, wz);
        ponto.transform.rotation = MorroRotacaoBase();

        Material matConcreto = MatCor(new Color(0.55f, 0.55f, 0.54f), 0.1f);
        Material matAmarelo = MatCor(new Color(0.95f, 0.72f, 0.12f), 0.25f);
        Material matAco = MatCor(new Color(0.24f, 0.26f, 0.29f), 0.35f);
        Material matZinco = ObterMaterial("morro_zinco", Color.white, texTelhadoZinco, new Vector2(2f, 1f), 0.2f, false);

        CriarCaixa("Calcada_Ponto_Mototaxi", ponto.transform, new Vector3(0f, -1.2f, 0f),
            new Vector3(6.4f, 2.5f, 4.4f), matConcreto, 1f, 1f, false, true);

        for (int v = -1; v <= 1; v++)
            CriarCaixa($"Vaga_{v}", ponto.transform, new Vector3(v * 1.45f - 0.7f, 0.06f, -0.35f), new Vector3(0.08f, 0.02f, 1.8f), matAmarelo, 1f, 1f, false, false);

        float px = 2.4f, pz = 1.3f;
        for (int sx = -1; sx <= 1; sx += 2)
            for (int sz = -1; sz <= 1; sz += 2)
                CriarCilindro("Pilar", ponto.transform, new Vector3(sx * px, 1.35f, sz * pz), 0.065f, 2.75f, matAco, true, 10);

        CriarCaixa("Telhado_Abrigo", ponto.transform, new Vector3(0f, 2.75f, 0f),
            new Vector3(5.6f, 0.14f, 3.4f), matZinco, 1f, 1f, false, true);
        CriarCaixa("Testeira_Amarela", ponto.transform, new Vector3(0f, 2.68f, -1.72f),
            new Vector3(5.4f, 0.42f, 0.12f), matAmarelo, 1f, 1f, false, false);
        CriarCaixa("Detalhe_Preto_Placa", ponto.transform, new Vector3(0f, 2.68f, -1.79f),
            new Vector3(3.6f, 0.18f, 0.03f), MatCor(new Color(0.12f, 0.12f, 0.13f), 0.2f), 1f, 1f, false, false);

        CriarCaixa("Banco_Espera", ponto.transform, new Vector3(0f, 0.35f, 1.05f),
            new Vector3(3.4f, 0.45f, 0.55f), MatCor(new Color(0.45f, 0.28f, 0.16f), 0.1f), 1f, 1f, false, true);
        CriarCilindro("Balizador_1", ponto.transform, new Vector3(-2.6f, 0.45f, -1.65f), 0.07f, 0.85f, matAmarelo, true, 10);
        CriarCilindro("Balizador_2", ponto.transform, new Vector3(2.6f, 0.45f, -1.65f), 0.07f, 0.85f, matAmarelo, true, 10);

        Color[] coresMotos = { new Color(0.85f, 0.18f, 0.14f), new Color(0.15f, 0.42f, 0.85f), new Color(0.92f, 0.68f, 0.10f) };
        for (int m = 0; m < 3; m++)
            CriarMotoEstilizada(ponto.transform, new Vector3(-1.45f + m * 1.45f, 0.06f, -0.35f), coresMotos[m], m);
    }

    private void CriarMotoEstilizada(Transform pai, Vector3 pos, Color corTanque, int idx)
    {
        GameObject moto = new GameObject($"Moto_{idx}");
        moto.transform.SetParent(pai, false);
        moto.transform.localPosition = pos;
        moto.transform.localRotation = Quaternion.Euler(0f, -16f + idx * 7f, 0f);

        Material matPneu = MatCor(new Color(0.10f, 0.10f, 0.11f), 0.1f);
        Material matMetal = MatCor(new Color(0.68f, 0.70f, 0.73f), 0.6f);
        Material matTanque = MatCor(corTanque, 0.45f);
        Material matBanco = MatCor(new Color(0.16f, 0.15f, 0.14f), 0.15f);

        GameObject pivoT = new GameObject("Roda_Tras");
        pivoT.transform.SetParent(moto.transform, false);
        pivoT.transform.localPosition = new Vector3(0f, 0.30f, -0.54f);
        CriarCilindro("Pneu_T", pivoT.transform, Vector3.zero, 0.58f, 0.14f, matPneu, false, 12)
            .transform.localRotation = Quaternion.Euler(0f, 0f, 90f);

        GameObject pivoF = new GameObject("Roda_Frente");
        pivoF.transform.SetParent(moto.transform, false);
        pivoF.transform.localPosition = new Vector3(0f, 0.30f, 0.56f);
        CriarCilindro("Pneu_F", pivoF.transform, Vector3.zero, 0.58f, 0.12f, matPneu, false, 12)
            .transform.localRotation = Quaternion.Euler(0f, 0f, 90f);

        CriarCaixa("Motor_Quadro", moto.transform, new Vector3(0f, 0.48f, 0f), new Vector3(0.28f, 0.34f, 0.86f), matMetal, 1f, 1f, false, true);
        CriarCilindro("Escapamento", moto.transform, new Vector3(0.18f, 0.32f, -0.22f), 0.045f, 0.78f, matMetal, false, 8)
            .transform.localRotation = Quaternion.Euler(86f, 0f, 0f);
        CriarCaixa("Banco", moto.transform, new Vector3(0f, 0.74f, -0.22f), new Vector3(0.26f, 0.14f, 0.58f), matBanco, 1f, 1f, false, false);
        CriarCaixa("Tanque", moto.transform, new Vector3(0f, 0.83f, 0.20f), new Vector3(0.32f, 0.22f, 0.38f), matTanque, 1f, 1f, false, false);
        CriarCaixa("Paralama_F", moto.transform, new Vector3(0f, 0.62f, 0.56f), new Vector3(0.16f, 0.06f, 0.32f), matTanque, 1f, 1f, false, false);
        CriarCaixa("Guidao", moto.transform, new Vector3(0f, 0.98f, 0.44f), new Vector3(0.68f, 0.06f, 0.08f), matMetal, 1f, 1f, false, false);
        CriarCaixa("Farol", moto.transform, new Vector3(0f, 0.88f, 0.55f), new Vector3(0.16f, 0.14f, 0.12f), MatLampada(), 1f, 1f, false, false);
        RegistrarObjetoDinamico(moto);
    }

    private void ConstruirCampinhoMorro(Transform pai)
    {
        if (morroPlatos.Count < 2) return;
        PlatoMorro pl = morroPlatos[1];

        MorroParaMundo(pl.along, pl.depth, out float wx, out float wz);
        GameObject campinho = new GameObject("Campinho_Morro");
        campinho.transform.SetParent(pai, false);
        campinho.transform.position = new Vector3(wx, alturaChao + pl.altura, wz);
        campinho.transform.rotation = MorroRotacaoBase();

        float larg = 22f;
        float comp = 14f;

        Material matPedra = ObterMaterial("morro_pedra_arrimo", Color.white, texPedraArrimo, Vector2.one, 0.05f, false);
        Material matConcreto = MatCor(new Color(0.55f, 0.55f, 0.54f), 0.1f);
        Material matGrama = ObterMaterial("morro_campinho_grama", Color.white, texCampinhoGrama, Vector2.one, 0.02f, false);
        Material matBranco = MatCor(new Color(0.95f, 0.95f, 0.95f), 0.15f);
        Material matPoste = MatCor(new Color(0.24f, 0.44f, 0.28f), 0.25f);
        Material matRede = MatCor(new Color(0.86f, 0.86f, 0.86f), 0.05f);

        CriarCaixa("Plataforma_Arrimo", campinho.transform, new Vector3(0f, -4.4f, 0f),
            new Vector3(larg + 3.6f, 9.0f, comp + 3.6f), matPedra, 3f, 2f, false, true);
        CriarCaixa("Campo_Grama", campinho.transform, new Vector3(0f, 0.12f, 0f),
            new Vector3(larg, 0.16f, comp), matGrama, larg, comp, false, true);

        CriarCaixa("Linha_N", campinho.transform, new Vector3(0f, 0.21f, comp * 0.46f), new Vector3(larg * 0.92f, 0.02f, 0.14f), matBranco, 1f, 1f, false, false);
        CriarCaixa("Linha_S", campinho.transform, new Vector3(0f, 0.21f, -comp * 0.46f), new Vector3(larg * 0.92f, 0.02f, 0.14f), matBranco, 1f, 1f, false, false);
        CriarCaixa("Linha_O", campinho.transform, new Vector3(-larg * 0.46f, 0.21f, 0f), new Vector3(0.14f, 0.02f, comp * 0.92f), matBranco, 1f, 1f, false, false);
        CriarCaixa("Linha_L", campinho.transform, new Vector3(larg * 0.46f, 0.21f, 0f), new Vector3(0.14f, 0.02f, comp * 0.92f), matBranco, 1f, 1f, false, false);
        CriarCaixa("Linha_Meio", campinho.transform, new Vector3(0f, 0.21f, 0f), new Vector3(0.14f, 0.02f, comp * 0.92f), matBranco, 1f, 1f, false, false);
        CriarCilindro("Circulo_Central", campinho.transform, new Vector3(0f, 0.205f, 0f), 1.8f, 0.02f, matBranco, false, 18);

        for (int lado = -1; lado <= 1; lado += 2)
        {
            float gx = lado * (larg * 0.45f);
            float fundo = gx + lado * 0.95f;
            CriarCilindro("Trave_Poste1", campinho.transform, new Vector3(gx, 1.15f, -1.8f), 0.06f, 2.0f, matBranco, true, 8);
            CriarCilindro("Trave_Poste2", campinho.transform, new Vector3(gx, 1.15f, 1.8f), 0.06f, 2.0f, matBranco, true, 8);
            CriarCaixa("Travessao", campinho.transform, new Vector3(gx, 2.15f, 0f), new Vector3(0.12f, 0.12f, 3.72f), matBranco, 1f, 1f, false, true);
            CriarCaixa("Rede_Base", campinho.transform, new Vector3(fundo, 0.24f, 0f), new Vector3(0.08f, 0.08f, 3.65f), matRede, 1f, 1f, false, false);
            for (int r = -3; r <= 3; r++)
                CriarCaixa("Rede_Fio", campinho.transform, new Vector3((gx + fundo) * 0.5f, 1.18f, r * 0.56f), new Vector3(0.95f, 1.85f, 0.03f), matRede, 1f, 1f, false, false);
        }

        for (int x = -11; x <= 11; x += 4)
        {
            CriarCilindro("Poste_Alambrado_F", campinho.transform, new Vector3(x, 1.7f, -comp * 0.5f - 0.6f), 0.045f, 3.2f, matPoste, false, 6);
            CriarCilindro("Poste_Alambrado_T", campinho.transform, new Vector3(x, 1.7f, comp * 0.5f + 0.6f), 0.045f, 3.2f, matPoste, false, 6);
        }
        CriarCaixa("Barra_Alambrado_F", campinho.transform, new Vector3(0f, 3.2f, -comp * 0.5f - 0.6f), new Vector3(larg + 1.2f, 0.08f, 0.08f), matPoste, 1f, 1f, false, false);
        CriarCaixa("Barra_Alambrado_T", campinho.transform, new Vector3(0f, 3.2f, comp * 0.5f + 0.6f), new Vector3(larg + 1.2f, 0.08f, 0.08f), matPoste, 1f, 1f, false, false);

        for (int deg = 0; deg < 3; deg++)
        {
            CriarCaixa($"Arquibancada_{deg}", campinho.transform,
                new Vector3(0f, 0.35f + deg * 0.45f, comp * 0.5f + 1.4f + deg * 0.85f),
                new Vector3(larg * 0.72f, 0.45f, 0.85f), matConcreto, 1f, 1f, false, true);
        }
        CriarCaixa("Banco_Reservas", campinho.transform, new Vector3(-4.5f, 0.42f, -comp * 0.5f - 0.25f),
            new Vector3(3.4f, 0.42f, 0.45f), MatCor(new Color(0.18f, 0.48f, 0.82f), 0.2f), 1f, 1f, false, true);

        for (int sx = -1; sx <= 1; sx += 2)
        {
            for (int sz = -1; sz <= 1; sz += 2)
            {
                Vector3 pRef = new Vector3(sx * (larg * 0.5f + 0.9f), 3.4f, sz * (comp * 0.5f + 0.9f));
                CriarCilindro("Poste_Refletor", campinho.transform, pRef, 0.08f, 6.8f, matConcreto, true, 8);
                CriarCaixa("Lampada_Refletor", campinho.transform, pRef + new Vector3(0f, 3.5f, 0f), new Vector3(0.75f, 0.35f, 0.45f), MatLampada(), 1f, 1f, false, false);
            }
        }
    }

    private void ConstruirIgrejinhaEMirante(Transform pai)
    {
        int idxPlato = morroPlatos.Count - 1;
        if (idxPlato < 0) return;
        PlatoMorro pl = morroPlatos[idxPlato];

        MorroParaMundo(pl.along, pl.depth, out float wx, out float wz);
        GameObject pracaTopo = new GameObject("Mirante_Igrejinha_Alto");
        pracaTopo.transform.SetParent(pai, false);
        pracaTopo.transform.position = new Vector3(wx, alturaChao + pl.altura, wz);
        pracaTopo.transform.rotation = MorroRotacaoBase();

        Material matPedra = ObterMaterial("morro_pedra_arrimo", Color.white, texPedraArrimo, Vector2.one, 0.05f, false);
        Material matCreme = MatCor(new Color(0.93f, 0.89f, 0.80f), 0.08f);
        Material matTerracota = MatCor(new Color(0.72f, 0.34f, 0.22f), 0.12f);
        Material matAzul = MatCor(new Color(0.24f, 0.48f, 0.74f), 0.35f);
        Material matConcreto = MatCor(new Color(0.58f, 0.58f, 0.57f), 0.08f);
        Material matFerro = MatCor(new Color(0.22f, 0.23f, 0.25f), 0.35f);
        Material matToldo = ObterMaterial("morro_toldo_listrado", Color.white, texToldoListrado, new Vector2(2f, 1f), 0.1f, false);

        CriarCaixa("Terraco_Mirante", pracaTopo.transform, new Vector3(0f, -4.65f, 0f),
            new Vector3(24.6f, 9.5f, 18.6f), matPedra, 3f, 2f, false, true);
        CriarCaixa("Calcada_Praca_Mirante", pracaTopo.transform, new Vector3(0f, 0.14f, 0f),
            new Vector3(24.0f, 0.18f, 18.0f), MatCalcada(), metrosPorTexturaCalcada, metrosPorTexturaCalcada, false, true);

        CriarCaixa("Parapeito_Mirante_Dir", pracaTopo.transform, new Vector3(4.1f, 0.65f, -8.6f),
            new Vector3(14.5f, 0.85f, 0.28f), matConcreto, 2f, 1f, false, true);
        CriarCaixa("Corrimao_Mirante_Dir", pracaTopo.transform, new Vector3(4.1f, 1.15f, -8.6f),
            new Vector3(14.7f, 0.09f, 0.34f), matFerro, 1f, 1f, false, false);

        for (int b = -1; b <= 1; b += 2)
            CriarCaixa($"Banco_Praca_{b}", pracaTopo.transform, new Vector3(3.8f + b * 4.2f, 0.44f, -6.9f), new Vector3(2.2f, 0.42f, 0.52f), MatCor(new Color(0.46f, 0.30f, 0.18f), 0.1f), 1f, 1f, false, true);

        CriarCilindro("Luneta_Haste", pracaTopo.transform, new Vector3(3.8f, 0.78f, -7.8f), 0.06f, 1.1f, matFerro, true, 8);
        CriarCilindro("Luneta_Tubo", pracaTopo.transform, new Vector3(3.8f, 1.36f, -7.85f), 0.07f, 0.46f, MatCor(new Color(0.84f, 0.68f, 0.24f), 0.6f), false, 10)
            .transform.localRotation = Quaternion.Euler(78f, 0f, 0f);

        GameObject igreja = new GameObject("Igrejinha_Morro");
        igreja.transform.SetParent(pracaTopo.transform, false);
        igreja.transform.localPosition = new Vector3(4.2f, 0.23f, 2.5f);

        CriarCaixa("Adro_Degrau", igreja.transform, new Vector3(0f, 0.12f, -4.6f), new Vector3(5.8f, 0.24f, 1.6f), matConcreto, 1f, 1f, false, true);
        CriarCaixa("Nave_Igreja", igreja.transform, new Vector3(0f, 2.5f, 0f), new Vector3(6.6f, 5.0f, 9.2f), matCreme, 2f, 2f, false, true);
        CriarCaixa("Moldura_Porta", igreja.transform, new Vector3(0f, 1.45f, -4.65f), new Vector3(2.2f, 2.9f, 0.22f), matTerracota, 1f, 1f, false, false);
        CriarCaixa("Porta_Madeira", igreja.transform, new Vector3(0f, 1.35f, -4.72f), new Vector3(1.7f, 2.6f, 0.14f), MatCor(new Color(0.36f, 0.22f, 0.12f), 0.15f), 1f, 1f, false, true);
        CriarCilindro("Roseta_Fachada", igreja.transform, new Vector3(0f, 3.85f, -4.66f), 0.68f, 0.14f, matAzul, false, 14)
            .transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        CriarCaixa("Telhado_Igreja", igreja.transform, new Vector3(0f, 5.3f, 0f), new Vector3(7.2f, 0.65f, 9.8f), matTerracota, 1f, 1f, false, true);

        for (int lado = -1; lado <= 1; lado += 2)
        {
            for (int j = -1; j <= 1; j++)
            {
                CriarCaixa($"Vitral_{lado}_{j}", igreja.transform, new Vector3(lado * 3.33f, 2.8f, j * 2.6f),
                    new Vector3(0.12f, 1.8f, 0.85f), matAzul, 1f, 1f, false, false);
            }
        }

        CriarCaixa("Torre_Sineira", igreja.transform, new Vector3(-2.1f, 6.9f, -3.2f), new Vector3(2.1f, 4.2f, 2.1f), matCreme, 1f, 1f, false, true);
        CriarCaixa("Cupula_Torre", igreja.transform, new Vector3(-2.1f, 9.2f, -3.2f), new Vector3(2.4f, 0.55f, 2.4f), matTerracota, 1f, 1f, false, false);
        CriarCilindro("Sino", igreja.transform, new Vector3(-2.1f, 8.2f, -3.2f), 0.28f, 0.72f, MatCor(new Color(0.84f, 0.68f, 0.24f), 0.6f), false, 10);
        CriarCaixa("Cruz_Vert", igreja.transform, new Vector3(-2.1f, 10.3f, -3.2f), new Vector3(0.16f, 1.7f, 0.16f), matTerracota, 1f, 1f, false, false);
        CriarCaixa("Cruz_Horiz", igreja.transform, new Vector3(-2.1f, 10.6f, -3.2f), new Vector3(0.95f, 0.16f, 0.16f), matTerracota, 1f, 1f, false, false);

        GameObject bar = new GameObject("Bar_Do_Alto");
        bar.transform.SetParent(pracaTopo.transform, false);
        bar.transform.localPosition = new Vector3(-6.2f, 0.23f, 2.2f);

        CriarCaixa("Corpo_Bar", bar.transform, new Vector3(0f, 1.75f, 0f), new Vector3(5.2f, 3.5f, 4.4f), MatCor(new Color(0.92f, 0.72f, 0.28f), 0.1f), 1f, 1f, false, true);
        CriarCaixa("Toldo_Bar", bar.transform, new Vector3(0f, 2.65f, -2.9f), new Vector3(5.4f, 0.15f, 1.9f), matToldo, 1f, 1f, false, false);
        CriarCaixa("Balcao_Bar", bar.transform, new Vector3(0f, 0.6f, -2.25f), new Vector3(3.4f, 1.15f, 0.55f), matCreme, 1f, 1f, false, true);

        Color[] corMesas = { new Color(0.88f, 0.22f, 0.18f), new Color(0.18f, 0.45f, 0.85f) };
        for (int m = 0; m < 2; m++)
        {
            Vector3 pm = new Vector3(-1.3f + m * 2.6f, 0.42f, -4.0f);
            Material matM = MatCor(corMesas[m], 0.25f);
            CriarCaixa("Mesa_Plastico", bar.transform, pm, new Vector3(0.85f, 0.08f, 0.85f), matM, 1f, 1f, false, true);
            CriarCilindro("Pe_Mesa", bar.transform, pm + new Vector3(0f, -0.21f, 0f), 0.07f, 0.42f, matM, false, 8);
            CriarCaixa("Cadeira_1", bar.transform, pm + new Vector3(-0.62f, -0.18f, 0f), new Vector3(0.38f, 0.42f, 0.38f), matM, 1f, 1f, false, false);
            CriarCaixa("Cadeira_2", bar.transform, pm + new Vector3(0.62f, -0.18f, 0f), new Vector3(0.38f, 0.42f, 0.38f), matM, 1f, 1f, false, false);
        }
    }

    private void ConstruirEscadoesECasasMorro(Transform pai, List<Vector3> pontosPostes, List<Vector3> pontosTelhados)
    {
        float densidade = Mathf.Clamp01(LerFloatMorro(0.75f, "densidadeCasasMorro", "densidadeFavela", "densidadeMorro"));
        if (presetQualidade == PresetQualidade.Leve) densidade *= 0.65f;

        for (int e = 0; e < 2; e++)
            ConstruirEscadaoSolido(pai, e, pontosPostes);

        Color[] paletaCasas =
        {
            new Color(0.86f, 0.45f, 0.26f),
            new Color(0.32f, 0.58f, 0.78f),
            new Color(0.88f, 0.72f, 0.28f),
            new Color(0.36f, 0.68f, 0.50f),
            new Color(0.86f, 0.82f, 0.74f),
            new Color(0.78f, 0.36f, 0.36f),
            new Color(0.92f, 0.91f, 0.88f),
        };

        GameObject grupoCasas = new GameObject("Casas_Morro");
        grupoCasas.transform.SetParent(pai, false);

        float passoA = 8.2f;
        float passoD = 8.8f;
        int casaIdx = 0;

        for (float d = 9.0f; d <= morroProfundidade * 0.72f; d += passoD)
        {
            for (float a = -morroMeiaLargura * 0.74f; a <= morroMeiaLargura * 0.74f; a += passoA)
            {
                if (Random.value > densidade) continue;

                float along = a + Random.Range(-1.0f, 1.0f);
                float depth = d + Random.Range(-0.9f, 0.9f);

                if (DistanciaParaEstrada(along, depth) < morroLarguraEstradaEfetiva * 0.5f + 4.8f) continue;
                if (DistanciaParaEscadas(along, depth) < 4.9f) continue;

                bool emPlato = false;
                for (int p = 0; p < morroPlatos.Count; p++)
                {
                    PlatoMorro pl = morroPlatos[p];
                    if (Mathf.Abs(along - pl.along) < pl.halfAlong + 4.0f && Mathf.Abs(depth - pl.depth) < pl.halfDepth + 4.0f)
                    { emPlato = true; break; }
                }
                if (emPlato) continue;

                ConstruirCasaMorroDetalhada(grupoCasas.transform, along, depth, paletaCasas, casaIdx++, pontosTelhados);
            }
        }

        for (int i = 3; i < morroPontosEstrada.Count - 1; i += 5)
        {
            Vector3 p = morroPontosEstrada[i];
            Vector3 pNext = morroPontosEstrada[Mathf.Min(morroPontosEstrada.Count - 1, i + 1)];
            Vector2 tang = new Vector2(pNext.x - p.x, pNext.z - p.z).normalized;
            Vector2 perp = new Vector2(-tang.y, tang.x);
            float lado = (i % 2 == 0) ? 1f : -1f;
            float off = morroLarguraEstradaEfetiva * 0.5f + 0.9f;

            float pa = p.x + perp.x * lado * off;
            float pd = p.z + perp.y * lado * off;
            MorroParaMundo(pa, pd, out float px, out float pz);
            float py = alturaChao + AmostrarGridMorro(pa, Mathf.Clamp(pd, 0f, morroProfundidade));
            Vector3 posPoste = new Vector3(px, py, pz);
            CriarPosteVerticalMorro(pai, posPoste, i);
            pontosPostes.Add(posPoste + Vector3.up * 4.9f);
        }
    }

    private void ConstruirEscadaoSolido(Transform pai, int idEscada, List<Vector3> pontosPostes)
    {
        List<Vector3> pts = morroPontosEscadas[idEscada];
        if (pts == null || pts.Count < 2) return;

        GameObject escada = new GameObject($"Escadao_Morro_{idEscada}");
        escada.transform.SetParent(pai, false);

        Material matConcreto = MatCor(new Color(0.54f, 0.54f, 0.53f), 0.08f);
        Material matDegrau = MatCor(new Color(0.70f, 0.69f, 0.67f), 0.08f);
        Material matCorrimao = MatCor(idEscada % 2 == 0 ? new Color(0.92f, 0.64f, 0.14f) : new Color(0.18f, 0.52f, 0.78f), 0.35f);
        Material matMureta = MatCor(new Color(0.86f, 0.82f, 0.76f), 0.08f);
        Color[] coresDegrau = { new Color(0.86f, 0.34f, 0.24f), new Color(0.24f, 0.56f, 0.80f), new Color(0.90f, 0.72f, 0.22f), new Color(0.26f, 0.64f, 0.44f) };

        float largEscada = 2.5f;
        float meiaLargEst = morroLarguraEstradaEfetiva * 0.5f + 0.55f;

        int n = pts.Count;
        Vector3[] cEsc = new Vector3[n];
        Vector3[] rEsc = new Vector3[n];
        float[] wEsc = new float[n];
        float[] yBotEsc = new float[n];

        for (int i = 0; i < n; i++)
        {
            Vector3 pm = pts[i];
            MorroParaMundo(pm.x, pm.z, out float wx, out float wz);
            cEsc[i] = new Vector3(wx, alturaChao + pm.y, wz);
            wEsc[i] = largEscada + 0.42f;
        }
        for (int i = 0; i < n; i++)
        {
            Vector3 pPrev = cEsc[Mathf.Max(0, i - 1)];
            Vector3 pNext = cEsc[Mathf.Min(n - 1, i + 1)];
            Vector3 tan = pNext - pPrev;
            tan.y = 0f;
            if (tan.sqrMagnitude < 0.0001f) tan = MorroRotacaoBase() * Vector3.forward;
            tan.Normalize();
            rEsc[i] = Vector3.Cross(Vector3.up, tan).normalized;

            Vector3 pm = pts[i];
            float hTer = AmostrarGridMorro(pm.x, Mathf.Clamp(pm.z, 0f, morroProfundidade));
            yBotEsc[i] = Mathf.Min(alturaChao - 1.6f, alturaChao + hTer - 3.2f);
        }

        Mesh meshBaseEsc = CriarMalhaAterroEstrada(cEsc, rEsc, wEsc, yBotEsc);
        GameObject baseObj = new GameObject($"Base_Escada_Morro_{idEscada}");
        baseObj.transform.SetParent(escada.transform, false);
        baseObj.AddComponent<MeshFilter>().sharedMesh = meshBaseEsc;
        baseObj.AddComponent<MeshRenderer>().sharedMaterial = matConcreto;
        baseObj.AddComponent<MeshCollider>().sharedMesh = meshBaseEsc;
        RegistrarObjetoDinamico(baseObj);

        MorroParaMundo(pts[0].x, -1.1f, out float ex, out float ez);
        GameObject patamarIni = new GameObject("Calcada_Escada_Base");
        patamarIni.transform.SetParent(escada.transform, false);
        patamarIni.transform.position = new Vector3(ex, TopoAsfalto + 0.04f, ez);
        patamarIni.transform.rotation = MorroRotacaoBase();
        CriarCaixa("Calcada_Piso", patamarIni.transform, Vector3.zero, new Vector3(largEscada + 0.9f, 0.24f, 2.6f),
            MatCalcada(), metrosPorTexturaCalcada, metrosPorTexturaCalcada, false, true);

        for (int i = 0; i < n - 1; i++)
        {
            Vector3 pm0 = pts[i];
            Vector3 pm1 = pts[i + 1];
            float medA = (pm0.x + pm1.x) * 0.5f;
            float medD = (pm0.z + pm1.z) * 0.5f;

            if (DistanciaParaEstrada(medA, medD) < meiaLargEst)
                continue;

            Vector3 p0 = cEsc[i];
            Vector3 p1 = cEsc[i + 1];
            Vector3 dif = p1 - p0;
            Vector3 difHoriz = new Vector3(dif.x, 0f, dif.z);
            float compHoriz = difHoriz.magnitude;
            if (compHoriz < 0.05f) continue;

            Quaternion rotHoriz = Quaternion.LookRotation(difHoriz.normalized, Vector3.up);
            Quaternion rotSlope = Quaternion.LookRotation(dif.normalized, Vector3.up);
            Vector3 meio = (p0 + p1) * 0.5f;
            float compSlope = dif.magnitude;

            GameObject deg = new GameObject("Calcada_Degrau");
            deg.transform.SetParent(escada.transform, false);
            deg.transform.position = meio + Vector3.up * 0.08f;
            deg.transform.rotation = rotHoriz;

            CriarCaixa("Calcada_Piso_Degrau", deg.transform, Vector3.zero,
                new Vector3(largEscada - 0.08f, 0.24f, compHoriz + 0.20f), matDegrau, 1f, 1f, false, true);

            if (i % 3 == 0)
            {
                Material matEspelho = MatCor(coresDegrau[i % coresDegrau.Length], 0.1f);
                CriarCaixa("Espelho_Colorido", deg.transform, new Vector3(0f, -0.02f, -compHoriz * 0.5f - 0.06f),
                    new Vector3(largEscada - 0.12f, 0.18f, 0.05f), matEspelho, 1f, 1f, false, false);
            }

            for (int lado = -1; lado <= 1; lado += 2)
            {
                float mx = lado * (largEscada * 0.5f + 0.12f);
                Vector3 sidePos = meio + rEsc[i] * mx;

                GameObject mur = CriarCaixa("Mureta", escada.transform, sidePos + Vector3.up * 0.24f,
                    new Vector3(0.18f, 0.52f, compSlope + 0.16f), matMureta, 1f, 1f, false, true);
                mur.transform.rotation = rotSlope;

                GameObject cor = CriarCaixa("Corrimao", escada.transform, sidePos + Vector3.up * 0.88f,
                    new Vector3(0.08f, 0.08f, compSlope + 0.16f), matCorrimao, 1f, 1f, false, false);
                cor.transform.rotation = rotSlope;

                if (i % 3 == 0)
                {
                    CriarCilindro("Suporte_Corrimao", escada.transform, sidePos + Vector3.up * 0.64f,
                        0.035f, 0.50f, matCorrimao, false, 6);
                }
            }

            if (i % 12 == 6)
            {
                Vector3 pPoste = p0 + rEsc[i] * (largEscada * 0.5f + 0.55f);
                CriarPosteVerticalMorro(escada.transform, pPoste, i + idEscada * 100);
                pontosPostes.Add(pPoste + Vector3.up * 4.9f);
            }
        }
    }

    private void ConstruirCasaMorroDetalhada(Transform pai, float along, float depth, Color[] paleta, int idx, List<Vector3> pontosTelhados)
    {
        float larg = Random.Range(4.1f, 6.0f);
        float prof = Random.Range(3.9f, 5.2f);

        AmostrarAreaMinMax(along, depth, larg * 0.65f, prof * 0.65f + 1.0f, out float hMin, out float hMax);
        float yPiso = alturaChao + hMax + 0.08f;
        float alturaBase = Mathf.Max(2.8f, (hMax - hMin) + 4.2f);

        MorroParaMundo(along, depth, out float wx, out float wz);
        GameObject casa = new GameObject($"Casa_Morro_{idx}");
        casa.transform.SetParent(pai, false);
        casa.transform.position = new Vector3(wx, yPiso, wz);
        casa.transform.rotation = MorroRotacaoBase() * Quaternion.Euler(0f, Random.Range(-8f, 8f), 0f);

        Material matConcreto = MatCor(new Color(0.55f, 0.55f, 0.54f), 0.08f);
        Material matPedra = ObterMaterial("morro_pedra_arrimo", Color.white, texPedraArrimo, Vector2.one, 0.05f, false);
        Material matTijolo = ObterMaterial("morro_tijolo", Color.white, texTijoloFavela, new Vector2(1.6f, 1.2f), 0.05f, false);
        Material matVidro = MatCor(new Color(0.18f, 0.28f, 0.38f), 0.72f);
        Material matMoldura = MatCor(new Color(0.92f, 0.92f, 0.90f), 0.15f);
        Material matFerro = MatCor(new Color(0.24f, 0.25f, 0.27f), 0.35f);
        Material matToldo = ObterMaterial("morro_toldo_listrado", Color.white, texToldoListrado, new Vector2(2f, 1f), 0.1f, false);

        CriarCaixa("Embasamento_Solido", casa.transform, new Vector3(0f, -alturaBase * 0.5f, 0f),
            new Vector3(larg * 0.98f, alturaBase, prof * 0.98f),
            Random.value < 0.55f ? matPedra : matTijolo, 1.5f, 1.5f, false, true);

        float px = larg * 0.45f, pz = prof * 0.45f;
        for (int sx = -1; sx <= 1; sx += 2)
            for (int sz = -1; sz <= 1; sz += 2)
                CriarCaixa("Pilar_Fundacao", casa.transform, new Vector3(sx * px, -alturaBase * 0.52f, sz * pz),
                    new Vector3(0.40f, alturaBase * 1.08f, 0.40f), matConcreto, 1f, 1f, false, true);

        CriarCaixa("Degrau_Entrada", casa.transform, new Vector3(0f, -0.35f, -prof * 0.5f - 0.38f),
            new Vector3(larg * 0.72f, 0.85f, 0.76f), matConcreto, 1f, 1f, false, true);

        int andares = Random.value < 0.24f ? 1 : (Random.value < 0.74f ? 2 : 3);
        bool ehComercioTerreo = Random.value < 0.16f;
        float altAndar = 2.75f;
        float yCursor = 0f;
        float largAtual = larg;
        float profAtual = prof;
        bool temVaranda = false;
        float varandaOffsetX = 0f;
        float varandaLarg = 0f;
        float varandaZ = 0f;

        for (int a = 0; a < andares; a++)
        {
            bool tijolo = (a == andares - 1 && Random.value < 0.38f) || Random.value < 0.22f;
            Color corAndar = paleta[Random.Range(0, paleta.Length)];
            Material matParede = tijolo ? matTijolo : MatCor(corAndar, 0.08f);

            float offsetX = a > 0 ? Random.Range(-0.18f, 0.18f) : 0f;
            if (a > 0 && Random.value < 0.45f) { largAtual *= 0.90f; profAtual *= 0.90f; }

            CriarCaixa($"Andar_{a}", casa.transform, new Vector3(offsetX, yCursor + altAndar * 0.5f, 0f),
                new Vector3(largAtual, altAndar, profAtual), matParede, 1.5f, 1.2f, true, true);

            CriarCaixa($"Laje_Andar_{a}", casa.transform, new Vector3(offsetX, yCursor + altAndar, 0f),
                new Vector3(largAtual + 0.18f, 0.18f, profAtual + 0.18f), matConcreto, 1f, 1f, false, false);

            if (a == 0)
            {
                if (ehComercioTerreo)
                {
                    CriarCaixa("Porta_Aco_Comercio", casa.transform, new Vector3(offsetX, 1.15f, -profAtual * 0.5f - 0.04f),
                        new Vector3(largAtual * 0.65f, 2.2f, 0.08f), MatCor(new Color(0.18f, 0.22f, 0.26f), 0.3f), 1f, 1f, false, false);
                    CriarCaixa("Toldo_Comercio", casa.transform, new Vector3(offsetX, 2.38f, -profAtual * 0.5f - 0.55f),
                        new Vector3(largAtual * 0.82f, 0.12f, 1.1f), matToldo, 1f, 1f, false, false);
                    CriarCaixa("Balcao_Comercio", casa.transform, new Vector3(offsetX, 0.45f, -profAtual * 0.5f - 0.28f),
                        new Vector3(largAtual * 0.55f, 0.85f, 0.42f), matConcreto, 1f, 1f, false, true);
                }
                else
                {
                    float xPorta = offsetX - largAtual * 0.24f;
                    CriarCaixa("Porta_Entrada", casa.transform, new Vector3(xPorta, 1.05f, -profAtual * 0.5f - 0.04f),
                        new Vector3(0.95f, 2.05f, 0.10f), MatCor(new Color(0.38f, 0.24f, 0.14f), 0.15f), 1f, 1f, false, false);
                    CriarCaixa("Marquise_Porta", casa.transform, new Vector3(xPorta, 2.18f, -profAtual * 0.5f - 0.35f),
                        new Vector3(1.38f, 0.10f, 0.72f), matConcreto, 1f, 1f, false, false);
                    CriarCaixa("Arandela_Porta", casa.transform, new Vector3(xPorta + 0.58f, 1.85f, -profAtual * 0.5f - 0.06f),
                        new Vector3(0.12f, 0.16f, 0.10f), MatLampada(), 1f, 1f, false, false);
                }
            }

            for (int j = 0; j < 2; j++)
            {
                if (a == 0 && (ehComercioTerreo || j == 1)) continue;
                float jx = offsetX + (j == 0 ? 0.24f : -0.24f) * largAtual;
                float jy = yCursor + 1.45f;
                CriarJanela3D(casa.transform, new Vector3(jx, jy, -profAtual * 0.5f), Vector3.zero, matMoldura, matVidro, matConcreto);
            }

            for (int lado = -1; lado <= 1; lado += 2)
            {
                if (Random.value < 0.70f)
                {
                    float lx = offsetX + lado * largAtual * 0.5f;
                    CriarJanela3D(casa.transform, new Vector3(lx, yCursor + 1.48f, 0f),
                        new Vector3(0f, lado < 0 ? 90f : -90f, 0f), matMoldura, matVidro, matConcreto);
                }
            }

            if (a >= 1 && Random.value < 0.32f)
            {
                CriarCaixa("ArCondicionado", casa.transform, new Vector3(offsetX + largAtual * 0.26f, yCursor + 0.85f, -profAtual * 0.5f - 0.18f),
                    new Vector3(0.56f, 0.38f, 0.36f), matMoldura, 1f, 1f, false, false);
            }

            if (a >= 1 && Random.value < 0.65f)
            {
                float zVar = -profAtual * 0.5f - 0.45f;
                float wVar = largAtual * 0.78f;
                CriarCaixa("Piso_Varanda", casa.transform, new Vector3(offsetX, yCursor + 0.06f, zVar),
                    new Vector3(wVar, 0.14f, 0.90f), matConcreto, 1f, 1f, false, true);
                CriarCaixa("Grade_Varanda", casa.transform, new Vector3(offsetX, yCursor + 0.95f, zVar - 0.40f),
                    new Vector3(wVar, 0.06f, 0.06f), matFerro, 1f, 1f, false, false);
                for (int b = -2; b <= 2; b++)
                    CriarCaixa("Balaustre", casa.transform, new Vector3(offsetX + b * (largAtual * 0.17f), yCursor + 0.50f, zVar - 0.40f),
                        new Vector3(0.05f, 0.85f, 0.05f), matFerro, 1f, 1f, false, false);

                if (!temVaranda)
                {
                    temVaranda = true;
                    varandaOffsetX = offsetX;
                    varandaLarg = wVar;
                    varandaZ = zVar - 0.34f;
                }
            }

            yCursor += altAndar + 0.12f;
        }

        if (temVaranda)
        {
            float altPilar = alturaBase + altAndar + 0.4f;
            float yPilar = (altAndar - alturaBase) * 0.5f;
            for (int sv = -1; sv <= 1; sv += 2)
            {
                CriarCaixa("Pilar_Varanda", casa.transform,
                    new Vector3(varandaOffsetX + sv * (varandaLarg * 0.44f), yPilar, varandaZ),
                    new Vector3(0.22f, altPilar, 0.22f), matConcreto, 1f, 1f, false, true);
            }
        }

        float tipoCobertura = Random.value;
        if (tipoCobertura < 0.48f)
        {
            GameObject telhado = new GameObject("Telhado_Inclinado");
            telhado.transform.SetParent(casa.transform, false);
            telhado.transform.localPosition = new Vector3(0f, yCursor + 0.28f, 0f);
            telhado.transform.localRotation = Quaternion.Euler(9f, 0f, 0f);
            bool barro = tipoCobertura < 0.20f;
            Material matTelhado = barro
                ? ObterMaterial("morro_telha_barro", Color.white, texTelhadoBarro, new Vector2(2.5f, 2.5f), 0.12f, false)
                : ObterMaterial("morro_zinco", Color.white, texTelhadoZinco, new Vector2(2f, 2f), 0.2f, false);
            CriarCaixa("Folha_Telhado", telhado.transform, Vector3.zero, new Vector3(largAtual + 0.6f, 0.11f, profAtual + 0.7f), matTelhado, 1f, 1f, false, true);
        }
        else
        {
            float mH = 0.48f;
            CriarCaixa("Platibanda_F", casa.transform, new Vector3(0f, yCursor + mH * 0.5f, -profAtual * 0.48f), new Vector3(largAtual, mH, 0.14f), matTijolo, 1f, 1f, false, false);
            CriarCaixa("Platibanda_T", casa.transform, new Vector3(0f, yCursor + mH * 0.5f, profAtual * 0.48f), new Vector3(largAtual, mH, 0.14f), matTijolo, 1f, 1f, false, false);
            CriarCaixa("Platibanda_E", casa.transform, new Vector3(-largAtual * 0.48f, yCursor + mH * 0.5f, 0f), new Vector3(0.14f, mH, profAtual), matTijolo, 1f, 1f, false, false);
            CriarCaixa("Platibanda_D", casa.transform, new Vector3(largAtual * 0.48f, yCursor + mH * 0.5f, 0f), new Vector3(0.14f, mH, profAtual), matTijolo, 1f, 1f, false, false);

            for (int sx = -1; sx <= 1; sx += 2)
                for (int sz = -1; sz <= 1; sz += 2)
                    CriarCaixa("Vergalhao", casa.transform, new Vector3(sx * largAtual * 0.44f, yCursor + 0.52f, sz * profAtual * 0.44f),
                        new Vector3(0.05f, 0.72f, 0.05f), matFerro, 1f, 1f, false, false);
        }

        if (Random.value < 0.80f)
        {
            Color corCx = Random.value < 0.75f ? new Color(0.12f, 0.45f, 0.78f) : new Color(0.18f, 0.18f, 0.20f);
            Vector3 pCx = new Vector3(largAtual * 0.22f, yCursor + 0.35f, profAtual * 0.20f);
            CriarCaixa("Suporte_CaixaAgua", casa.transform, pCx + new Vector3(0f, -0.15f, 0f), new Vector3(0.95f, 0.35f, 0.95f), matTijolo, 1f, 1f, false, false);
            CriarCilindro("Caixa_Agua", casa.transform, pCx + new Vector3(0f, 0.42f, 0f), 0.46f, 0.84f, MatCor(corCx, 0.35f), true, 12);
            CriarCilindro("Tampa_Caixa", casa.transform, pCx + new Vector3(0f, 0.86f, 0f), 0.49f, 0.12f, MatCor(corCx * 0.85f, 0.35f), false, 12);
            CriarCilindro("Cano_PVC", casa.transform, pCx + new Vector3(-0.35f, 0.0f, -0.35f), 0.03f, 0.65f, MatCor(new Color(0.52f, 0.32f, 0.20f), 0.3f), false, 6);
        }

        if (Random.value < 0.45f)
        {
            Vector3 pAnt = new Vector3(-largAtual * 0.26f, yCursor + 0.6f, -profAtual * 0.25f);
            CriarCilindro("Haste_Antena", casa.transform, pAnt, 0.03f, 1.15f, matFerro, false, 6);
            GameObject disco = CriarCilindro("Prato_Parabolica", casa.transform, pAnt + new Vector3(0f, 0.45f, -0.12f), 0.38f, 0.08f, matMoldura, false, 12);
            disco.transform.localRotation = Quaternion.Euler(55f, Random.Range(-30f, 30f), 0f);
        }

        if (Random.value < 0.42f)
        {
            float yVar = yCursor + 0.88f;
            float zVar = -profAtual * 0.35f;
            CriarCilindro("Poste_Varal_E", casa.transform, new Vector3(-1.05f, yVar - 0.35f, zVar), 0.025f, 0.9f, matFerro, false, 6);
            CriarCilindro("Poste_Varal_D", casa.transform, new Vector3(1.05f, yVar - 0.35f, zVar), 0.025f, 0.9f, matFerro, false, 6);
            CriarCaixa("Corda_Varal", casa.transform, new Vector3(0f, yVar + 0.06f, zVar), new Vector3(2.1f, 0.02f, 0.02f), matMoldura, 1f, 1f, false, false);

            Color[] corRoupa = { Color.red, Color.white, new Color(0.2f, 0.6f, 0.9f), new Color(0.95f, 0.85f, 0.2f) };
            for (int r = 0; r < 3; r++)
                CriarCaixa($"Roupa_Varal_{r}", casa.transform, new Vector3(-0.6f + r * 0.6f, yVar - 0.16f, zVar),
                    new Vector3(0.32f, 0.44f, 0.04f), MatCor(corRoupa[Random.Range(0, corRoupa.Length)], 0.05f), 1f, 1f, false, false);
        }

        pontosTelhados.Add(casa.transform.TransformPoint(new Vector3(0f, yCursor + 0.7f, -profAtual * 0.45f)));
    }

    private void CriarJanela3D(Transform pai, Vector3 pos, Vector3 rotEuler, Material matMoldura, Material matVidro, Material matPeitoril)
    {
        GameObject jan = new GameObject("Janela_3D");
        jan.transform.SetParent(pai, false);
        jan.transform.localPosition = pos;
        jan.transform.localRotation = Quaternion.Euler(rotEuler);

        CriarCaixa("Moldura", jan.transform, new Vector3(0f, 0f, -0.03f), new Vector3(1.12f, 1.04f, 0.08f), matMoldura, 1f, 1f, false, false);
        CriarCaixa("Vidro", jan.transform, new Vector3(0f, 0f, -0.05f), new Vector3(0.92f, 0.84f, 0.07f), matVidro, 1f, 1f, false, false);
        CriarCaixa("Divisoria", jan.transform, new Vector3(0f, 0f, -0.065f), new Vector3(0.05f, 0.86f, 0.05f), matMoldura, 1f, 1f, false, false);
        CriarCaixa("Peitoril", jan.transform, new Vector3(0f, -0.54f, -0.08f), new Vector3(1.22f, 0.08f, 0.16f), matPeitoril, 1f, 1f, false, false);
    }

    private void CriarPosteVerticalMorro(Transform pai, Vector3 posMundo, int idx)
    {
        GameObject poste = new GameObject($"Poste_Morro_{idx}");
        poste.transform.SetParent(pai, false);
        poste.transform.position = posMundo;
        poste.transform.rotation = Quaternion.identity;

        Material matPoste = MatCor(new Color(0.46f, 0.46f, 0.46f), 0.1f);
        Material matBraco = MatCor(new Color(0.28f, 0.29f, 0.31f), 0.35f);

        CriarCaixa("Base_Poste", poste.transform, new Vector3(0f, -0.6f, 0f), new Vector3(0.42f, 1.8f, 0.42f), matPoste, 1f, 1f, false, true);
        CriarCilindro("Haste", poste.transform, new Vector3(0f, 2.5f, 0f), 0.10f, 5.2f, matPoste, true, 8);
        CriarCaixa("Cruzeta", poste.transform, new Vector3(0f, 4.85f, 0f), new Vector3(1.1f, 0.10f, 0.12f), matBraco, 1f, 1f, false, false);
        CriarCilindro("Transformador", poste.transform, new Vector3(0.26f, 4.15f, 0f), 0.19f, 0.76f, MatCor(new Color(0.35f, 0.37f, 0.40f), 0.25f), false, 10);
        CriarCaixa("Braco_Luminaria", poste.transform, new Vector3(0f, 5.05f, -0.45f), new Vector3(0.10f, 0.08f, 0.95f), matBraco, 1f, 1f, false, false);
        CriarCaixa("Lampada", poste.transform, new Vector3(0f, 5.00f, -0.92f), new Vector3(0.32f, 0.14f, 0.36f), MatLampada(), 1f, 1f, false, false);
    }

    private void ConstruirVegetacaoERochasMorro(Transform pai)
    {
        GameObject vegGrupo = new GameObject("Vegetacao_Rochas_Morro");
        vegGrupo.transform.SetParent(pai, false);

        int qtdArvores = presetQualidade == PresetQualidade.Leve ? 34 : (presetQualidade == PresetQualidade.Medio ? 56 : 80);
        int qtdRochas = presetQualidade == PresetQualidade.Leve ? 24 : (presetQualidade == PresetQualidade.Medio ? 40 : 60);
        int qtdArbustos = presetQualidade == PresetQualidade.Leve ? 45 : (presetQualidade == PresetQualidade.Medio ? 80 : 120);

        for (int i = 0; i < qtdArvores; i++)
        {
            float along = Random.Range(-morroMeiaLargura * 0.90f, morroMeiaLargura * 0.90f);
            float depth = Random.Range(4.0f, morroProfundidade * 0.92f);
            if (!LocalLivreParaNatureza(along, depth, morroLarguraEstradaEfetiva * 0.5f + 2.8f, 4.6f)) continue;

            float h = AmostrarGridMorro(along, depth);
            MorroParaMundo(along, depth, out float wx, out float wz);
            Vector3 p = new Vector3(wx, alturaChao + h - 0.30f, wz);

            float r = Random.value;
            if (r < 0.28f) CriarPalmeiraMorro(vegGrupo.transform, p, Random.Range(0.85f, 1.3f), i);
            else if (r < 0.45f) CriarBananeiraMorro(vegGrupo.transform, p, i);
            else CriarArvoreMorro(vegGrupo.transform, p, Random.Range(0.8f, 1.35f), i);
        }

        for (int i = 0; i < qtdArbustos; i++)
        {
            float along = Random.Range(-morroMeiaLargura * 0.92f, morroMeiaLargura * 0.92f);
            float depth = Random.Range(3.2f, morroProfundidade * 0.94f);
            if (!LocalLivreParaNatureza(along, depth, morroLarguraEstradaEfetiva * 0.5f + 2.0f, 3.8f)) continue;

            float h = AmostrarGridMorro(along, depth);
            MorroParaMundo(along, depth, out float wx, out float wz);
            if (i % 2 == 0)
                CriarArbustoMorro(vegGrupo.transform, new Vector3(wx, alturaChao + h - 0.1f, wz), Random.Range(0.7f, 1.4f), i);
            else
                CriarMoitaCapimMorro(vegGrupo.transform, new Vector3(wx, alturaChao + h - 0.05f, wz), Random.Range(0.8f, 1.4f), i);
        }

        for (int i = 0; i < qtdRochas; i++)
        {
            float along = Random.Range(-morroMeiaLargura * 0.92f, morroMeiaLargura * 0.92f);
            float depth = Random.Range(3.5f, morroProfundidade * 0.92f);
            if (!LocalLivreParaNatureza(along, depth, morroLarguraEstradaEfetiva * 0.5f + 2.4f, 4.0f)) continue;

            float h = AmostrarGridMorro(along, depth);
            MorroParaMundo(along, depth, out float wx, out float wz);
            CriarRochaMorro(vegGrupo.transform, new Vector3(wx, alturaChao + h - 0.35f, wz), Random.Range(0.9f, 2.6f), seedAleatoria + 800 + i);
        }
    }

    private bool LocalLivreParaNatureza(float along, float depth, float margemEstrada, float margemEscada)
    {
        if (DistanciaParaEstrada(along, depth) < margemEstrada) return false;
        if (DistanciaParaEscadas(along, depth) < margemEscada) return false;
        for (int i = 0; i < morroPlatos.Count; i++)
        {
            PlatoMorro pl = morroPlatos[i];
            if (Mathf.Abs(along - pl.along) < pl.halfAlong + 2.2f && Mathf.Abs(depth - pl.depth) < pl.halfDepth + 2.2f)
                return false;
        }
        return true;
    }

    private void CriarArvoreMorro(Transform pai, Vector3 pos, float esc, int idx)
    {
        GameObject arv = new GameObject($"Arvore_Morro_{idx}");
        arv.transform.SetParent(pai, false);
        arv.transform.position = pos;

        float hTronco = 2.4f * esc;
        CriarCilindro("Tronco", arv.transform, new Vector3(0f, hTronco * 0.5f, 0f),
            0.17f * esc, hTronco, MatTronco(), true, 8);

        Color[] tonsCopa =
        {
            new Color(0.18f, 0.48f, 0.18f),
            new Color(0.24f, 0.54f, 0.20f),
            new Color(0.15f, 0.42f, 0.22f),
            new Color(0.86f, 0.72f, 0.16f)
        };
        Color corCopa = Random.value < 0.12f ? tonsCopa[3] : tonsCopa[Random.Range(0, 3)];
        Material matCopa = MatCor(corCopa, 0.02f);

        Mesh copaMesh = CriarMeshFacetada(1.25f * esc, seedAleatoria + 900 + idx);
        for (int c = 0; c < 3; c++)
        {
            GameObject lobe = new GameObject($"Copa_{c}");
            lobe.transform.SetParent(arv.transform, false);
            lobe.transform.localPosition = new Vector3(
                (c == 0 ? 0f : (c == 1 ? 0.65f : -0.60f)) * esc,
                hTronco + (c == 0 ? 0.85f : 0.45f) * esc,
                (c == 0 ? 0f : 0.35f) * esc);
            lobe.transform.localScale = c == 0 ? Vector3.one : new Vector3(0.75f, 0.68f, 0.75f);
            lobe.AddComponent<MeshFilter>().sharedMesh = copaMesh;
            lobe.AddComponent<MeshRenderer>().sharedMaterial = matCopa;
        }
    }

    private void CriarPalmeiraMorro(Transform pai, Vector3 pos, float esc, int idx)
    {
        GameObject palm = new GameObject($"Palmeira_Morro_{idx}");
        palm.transform.SetParent(pai, false);
        palm.transform.position = pos;

        float segH = 1.6f * esc;
        Vector3 cursor = Vector3.zero;
        float incl = Random.Range(-5f, 5f);
        for (int s = 0; s < 3; s++)
        {
            GameObject seg = new GameObject($"Estipe_{s}");
            seg.transform.SetParent(palm.transform, false);
            seg.transform.localPosition = cursor;
            seg.transform.localRotation = Quaternion.Euler(incl * (s + 1), 0f, incl * 0.6f * s);
            CriarCilindro("Tronco", seg.transform, new Vector3(0f, segH * 0.5f, 0f), (0.14f - s * 0.02f) * esc, segH + 0.1f, MatTronco(), s == 0, 8);
            cursor = seg.transform.localPosition + seg.transform.localRotation * new Vector3(0f, segH, 0f);
        }

        Material matFolha = MatCor(new Color(0.20f, 0.54f, 0.20f), 0.05f);
        for (int f = 0; f < 6; f++)
        {
            GameObject folha = new GameObject($"Folha_{f}");
            folha.transform.SetParent(palm.transform, false);
            folha.transform.localPosition = cursor;
            folha.transform.localRotation = Quaternion.Euler(22f, f * 60f, 0f);
            CriarCaixa("Palma", folha.transform, new Vector3(0f, 0f, 1.05f * esc),
                new Vector3(0.55f * esc, 0.07f, 2.2f * esc), matFolha, 1f, 1f, false, false);
        }
    }

    private void CriarBananeiraMorro(Transform pai, Vector3 pos, int idx)
    {
        GameObject ban = new GameObject($"Bananeira_Morro_{idx}");
        ban.transform.SetParent(pai, false);
        ban.transform.position = pos;

        Material matCaule = MatCor(new Color(0.32f, 0.48f, 0.20f), 0.05f);
        Material matFolha = MatCor(new Color(0.26f, 0.60f, 0.22f), 0.08f);

        CriarCilindro("Caule", ban.transform, new Vector3(0f, 0.9f, 0f), 0.11f, 1.8f, matCaule, false, 6);
        for (int f = 0; f < 5; f++)
        {
            GameObject folha = new GameObject($"Folha_{f}");
            folha.transform.SetParent(ban.transform, false);
            folha.transform.localPosition = new Vector3(0f, 1.7f, 0f);
            folha.transform.localRotation = Quaternion.Euler(28f, f * 72f, 0f);
            CriarCaixa("Lamina", folha.transform, new Vector3(0f, 0f, 0.85f), new Vector3(0.62f, 0.05f, 1.75f), matFolha, 1f, 1f, false, false);
        }
    }

    private void CriarArbustoMorro(Transform pai, Vector3 pos, float esc, int idx)
    {
        GameObject arb = new GameObject($"Arbusto_Morro_{idx}");
        arb.transform.SetParent(pai, false);
        arb.transform.position = pos;

        Mesh m = CriarMeshFacetada(0.65f * esc, seedAleatoria + 1200 + idx);
        arb.AddComponent<MeshFilter>().sharedMesh = m;
        Color c = Random.value < 0.5f ? new Color(0.22f, 0.48f, 0.18f) : new Color(0.30f, 0.54f, 0.22f);
        arb.AddComponent<MeshRenderer>().sharedMaterial = MatCor(c, 0.02f);
    }

    private void CriarMoitaCapimMorro(Transform pai, Vector3 pos, float esc, int idx)
    {
        GameObject moita = new GameObject($"Capim_Morro_{idx}");
        moita.transform.SetParent(pai, false);
        moita.transform.position = pos;
        Material matCapim = MatCor(new Color(0.32f, 0.54f, 0.20f), 0.02f);
        for (int k = 0; k < 3; k++)
        {
            GameObject f = new GameObject($"Tufo_{k}");
            f.transform.SetParent(moita.transform, false);
            f.transform.localRotation = Quaternion.Euler(Random.Range(-15f, 15f), k * 60f, 0f);
            CriarCaixa("Folha", f.transform, new Vector3(0f, 0.32f * esc, 0f), new Vector3(0.75f * esc, 0.65f * esc, 0.06f), matCapim, 1f, 1f, false, false);
        }
    }

    private void CriarRochaMorro(Transform pai, Vector3 pos, float esc, int seed)
    {
        GameObject rocha = new GameObject($"Rocha_Morro_{seed}");
        rocha.transform.SetParent(pai, false);
        rocha.transform.position = pos;
        rocha.transform.localRotation = Quaternion.Euler(Random.Range(-15f, 15f), Random.Range(0f, 360f), Random.Range(-15f, 15f));
        rocha.transform.localScale = new Vector3(1.25f, 0.78f, 1.0f);

        Mesh m = CriarMeshFacetada(esc, seed);
        rocha.AddComponent<MeshFilter>().sharedMesh = m;
        float t = 0.42f + (seed % 5) * 0.03f;
        rocha.AddComponent<MeshRenderer>().sharedMaterial = MatCor(new Color(t * 1.04f, t * 0.99f, t * 0.92f), 0.05f);
        MeshCollider mc = rocha.AddComponent<MeshCollider>();
        mc.sharedMesh = m;
        RegistrarObjetoDinamico(rocha);
    }

    private Mesh CriarMeshFacetada(float raio, int seed)
    {
        Vector3[] baseVerts =
        {
            Vector3.up, Vector3.down, Vector3.left, Vector3.right, Vector3.forward, Vector3.back,
            new Vector3(1,1,1).normalized, new Vector3(-1,1,1).normalized,
            new Vector3(1,1,-1).normalized, new Vector3(-1,1,-1).normalized,
            new Vector3(1,-1,1).normalized, new Vector3(-1,-1,1).normalized,
            new Vector3(1,-1,-1).normalized, new Vector3(-1,-1,-1).normalized
        };

        int[] idx =
        {
            0,6,8, 0,8,3, 0,3,6,
            0,7,6, 0,4,7, 0,6,4,
            0,9,7, 0,2,9, 0,7,2,
            0,8,9, 0,5,8, 0,9,5,
            1,10,12, 1,12,5, 1,5,10,
            1,11,10, 1,4,11, 1,10,4,
            1,13,11, 1,2,13, 1,11,2,
            1,12,13, 1,3,12, 1,13,3,
            3,8,12, 3,12,10, 3,10,6, 3,6,8,
            4,6,10, 4,10,11, 4,11,7, 4,7,6,
            2,7,11, 2,11,13, 2,13,9, 2,9,7,
            5,9,13, 5,13,12, 5,12,8, 5,8,9
        };

        Vector3[] deslocados = new Vector3[baseVerts.Length];
        for (int i = 0; i < baseVerts.Length; i++)
        {
            float r = 0.78f + Hash(i, seed, seed + 17) * 0.44f;
            deslocados[i] = baseVerts[i] * (raio * r);
        }

        Vector3[] verts = new Vector3[idx.Length];
        int[] tris = new int[idx.Length];
        for (int i = 0; i < idx.Length; i++)
        {
            verts[i] = deslocados[idx[i]];
            tris[i] = i;
        }

        Mesh mesh = new Mesh { name = "MalhaFacetadaMorro" };
        mesh.vertices = verts;
        mesh.triangles = tris;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        meshesGerados.Add(mesh);
        return mesh;
    }

    private void ConstruirFiacaoMorro(Transform pai, List<Vector3> pontosPostes, List<Vector3> pontosTelhados)
    {
        if (pontosPostes.Count < 2) return;

        GameObject fiacaoGrupo = new GameObject("Fiacao_Morro");
        fiacaoGrupo.transform.SetParent(pai, false);

        Material matFio = MatCor(new Color(0.08f, 0.08f, 0.09f), 0.1f);

        for (int i = 0; i < pontosPostes.Count - 1; i++)
        {
            Vector3 a = pontosPostes[i];
            Vector3 b = pontosPostes[i + 1];
            if (Vector3.Distance(a, b) > 30f) continue;

            CriarCaboCatenaria(fiacaoGrupo.transform, $"Fio_Rede_{i}", a, b, 0.55f, 0.035f, matFio);
            CriarCaboCatenaria(fiacaoGrupo.transform, $"Fio_Rede2_{i}", a - Vector3.up * 0.25f, b - Vector3.up * 0.25f, 0.65f, 0.025f, matFio);
        }

        for (int c = 0; c < pontosTelhados.Count; c++)
        {
            Vector3 casaTopo = pontosTelhados[c];
            Vector3 melhorPoste = Vector3.zero;
            float menorDist = 22f;

            for (int p = 0; p < pontosPostes.Count; p++)
            {
                float d = Vector3.Distance(casaTopo, pontosPostes[p]);
                if (d < menorDist)
                {
                    menorDist = d;
                    melhorPoste = pontosPostes[p];
                }
            }

            if (menorDist < 22f)
                CriarCaboCatenaria(fiacaoGrupo.transform, $"Gato_{c}", melhorPoste, casaTopo, 0.45f, 0.022f, matFio);
        }
    }

    private void CriarCaboCatenaria(Transform pai, string nome, Vector3 a, Vector3 b, float flecha, float espessura, Material mat)
    {
        GameObject obj = new GameObject(nome);
        obj.transform.SetParent(pai, false);

        LineRenderer lr = obj.AddComponent<LineRenderer>();
        lr.useWorldSpace = false;
        lr.positionCount = 7;
        lr.startWidth = espessura;
        lr.endWidth = espessura;
        lr.sharedMaterial = mat;
        lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        lr.receiveShadows = false;

        for (int i = 0; i < 7; i++)
        {
            float t = i / 6f;
            Vector3 pos = Vector3.Lerp(a, b, t);
            pos.y -= 4f * flecha * t * (1f - t);
            lr.SetPosition(i, pos);
        }

        RegistrarLinha(lr);
    }

    private void MorroParaMundo(float along, float depth, out float wx, out float wz)
    {
        switch (morroLadoInt)
        {
            case 0:
                wx = morroBordaBase + depth;
                wz = -along;
                break;
            case 1:
                wx = -morroBordaBase - depth;
                wz = along;
                break;
            case 3:
                wx = -along;
                wz = -morroBordaBase - depth;
                break;
            default:
                wx = along;
                wz = morroBordaBase + depth;
                break;
        }
    }

    private void MundoParaMorro(float wx, float wz, out float along, out float depth)
    {
        switch (morroLadoInt)
        {
            case 0:
                depth = wx - morroBordaBase;
                along = -wz;
                break;
            case 1:
                depth = -morroBordaBase - wx;
                along = wz;
                break;
            case 3:
                depth = -morroBordaBase - wz;
                along = -wx;
                break;
            default:
                depth = wz - morroBordaBase;
                along = wx;
                break;
        }
    }

    private Quaternion MorroRotacaoBase()
    {
        switch (morroLadoInt)
        {
            case 0: return Quaternion.LookRotation(Vector3.right, Vector3.up);
            case 1: return Quaternion.LookRotation(Vector3.left, Vector3.up);
            case 3: return Quaternion.LookRotation(Vector3.back, Vector3.up);
            default: return Quaternion.LookRotation(Vector3.forward, Vector3.up);
        }
    }

    private bool LerBoolMorro(bool padrao, params string[] nomes)
    {
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        for (int i = 0; i < nomes.Length; i++)
        {
            FieldInfo f = GetType().GetField(nomes[i], flags);
            if (f != null && f.FieldType == typeof(bool))
                return (bool)f.GetValue(this);
        }
        return padrao;
    }

    private float LerFloatMorro(float padrao, params string[] nomes)
    {
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        for (int i = 0; i < nomes.Length; i++)
        {
            FieldInfo f = GetType().GetField(nomes[i], flags);
            if (f != null && f.FieldType == typeof(float))
                return (float)f.GetValue(this);
        }
        return padrao;
    }

    private Vector3 LerVector3Morro(Vector3 padrao, params string[] nomes)
    {
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        for (int i = 0; i < nomes.Length; i++)
        {
            FieldInfo f = GetType().GetField(nomes[i], flags);
            if (f != null && f.FieldType == typeof(Vector3))
                return (Vector3)f.GetValue(this);
        }
        return padrao;
    }

    private int LerLadoMorroInt()
    {
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        FieldInfo f = GetType().GetField("ladoMorro", flags) ?? GetType().GetField("ladoDoMorro", flags);
        if (f == null) return 2;
        object val = f.GetValue(this);
        if (val == null) return 2;
        string nome = val.ToString();
        if (nome == "Leste") return 0;
        if (nome == "Oeste") return 1;
        if (nome == "Sul") return 3;
        return 2;
    }
}