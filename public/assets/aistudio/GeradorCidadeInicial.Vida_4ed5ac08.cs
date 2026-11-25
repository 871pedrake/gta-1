using System.Collections.Generic;
using System.Reflection;
using UnityEngine;

public partial class GeradorCidadeInicial
{
    [Header("Bicicletas, Pedestres e Fauna (Etapa 4)")]
    public bool criarBicicletas = true;
    public bool criarPedestres = true;
    [Range(0f, 1f)] public float densidadePedestres = 0.70f;
    public bool criarFauna = true;

    [Header("Detalhes Finais de Rua (Etapa 4)")]
    public bool criarFiacaoRuasNormais = true;
    public bool criarPlacasEVapor = true;

    [Header("Ciclo Dia/Noite e Clima (Etapa 4)")]
    public bool criarCicloDiaNoite = true;
    [Range(0f, 24f)]
    [Tooltip("16.5 = pôr do sol estilo GTA; 21 = noite; 10 = manhã.")]
    public float horaInicial = 16.5f;
    [Min(30f)] public float duracaoDiaSegundos = 240f;
    public bool congelarHora = false;
    [Range(0, 8)] public int maxLuzesPoolNoturnas = 6;

    public bool chuvaAtiva = false;
    [Range(0.1f, 1f)] public float intensidadeChuva = 0.75f;

    [System.NonSerialized] private Texture2D texJanelasEmissao;

    partial void ExecutarEtapa4(Transform raiz)
    {
        ObterDimensoesEtapa4(out float halfX, out float halfZ, out float pX, out float pZ);

        GameObject vidaRoot = new GameObject("Vida_Cidade_Gerada");
        vidaRoot.transform.SetParent(raiz, false);

        List<CidadeSemaforoControlador> semaforos = ColetarSemaforosEtapa4(raiz);
        List<Vector3> posicoesLuminarias = ColetarPosicoesLampadasEtapa4(raiz);

        if (criarFiacaoRuasNormais || criarPlacasEVapor)
            ConstruirDetalhesFinaisRua(vidaRoot.transform, halfX, halfZ, pX, pZ);

        if (criarBicicletas)
            ConstruirBicicletas(vidaRoot.transform, halfX, halfZ, pX, pZ);

        if (criarPedestres)
            ConstruirPedestres(vidaRoot.transform, halfX, halfZ, pX, pZ, semaforos);

        if (criarFauna)
            ConstruirFauna(vidaRoot.transform, halfX, halfZ);

        if (criarCicloDiaNoite)
            ConfigurarCicloDiaNoite(vidaRoot.transform, posicoesLuminarias, new List<Material>(), new List<Material>());

        ConfigurarClimaChuva(vidaRoot.transform);
    }

    private void ConstruirBicicletas(Transform pai, float halfX, float halfZ, float pX, float pZ)
    {
        GameObject biciGrupo = new GameObject("Bicicletas_Cidade");
        biciGrupo.transform.SetParent(pai, false);

        int alvo = presetQualidade == PresetQualidade.Leve ? 6 : (presetQualidade == PresetQualidade.Medio ? 12 : 16);
        bool temRio = LerBoolEtapa4(true, "criarRio");

        int criadas = 0;
        for (int i = 0; i < alvo * 3 && criadas < alvo; i++)
        {
            int gx = Random.Range(0, quadrasX);
            int gz = Random.Range(0, quadrasZ);
            if (temRio && QuadraEhCorredorRio(gx, gz)) continue;

            float cx = -halfX + larguraRua + gx * pX + tamanhoQuadra * 0.5f;
            float cz = -halfZ + larguraRua + gz * pZ + tamanhoQuadra * 0.5f;
            float bx = cx + (Random.value < 0.5f ? -1f : 1f) * (tamanhoQuadra * 0.5f - 0.85f);
            float bz = cz + Random.Range(-tamanhoQuadra * 0.35f, tamanhoQuadra * 0.35f);

            if (temRio && RetanguloSobreRio(bx, bz, 2f, 2f)) continue;

            float by = Mathf.Max(TopoCalcada(false), AlturaTerrenoSeguraEtapa4(bx, bz));
            GameObject bici = CriarBicicleta(biciGrupo.transform, new Vector3(bx, by, bz), criadas);
            bici.transform.rotation = Quaternion.Euler(0f, Random.Range(0f, 360f), 0f);
            RegistrarObjetoDinamico(bici);
            criadas++;
        }
    }

    private GameObject CriarBicicleta(Transform pai, Vector3 pos, int idx)
    {
        GameObject bici = new GameObject($"Bicicleta_{idx}");
        bici.transform.SetParent(pai, false);
        bici.transform.position = pos;

        Color[] cores =
        {
            new Color(0.86f, 0.22f, 0.18f),
            new Color(0.18f, 0.52f, 0.88f),
            new Color(0.20f, 0.68f, 0.36f),
            new Color(0.92f, 0.72f, 0.14f),
            new Color(0.86f, 0.88f, 0.90f)
        };
        Material matQuadro = MatCor(cores[idx % cores.Length], 0.45f);
        Material matPneu = MatCor(new Color(0.10f, 0.10f, 0.11f), 0.12f);
        Material matAro = MatCor(new Color(0.75f, 0.77f, 0.80f), 0.65f);
        Material matBanco = MatCor(new Color(0.16f, 0.15f, 0.14f), 0.15f);

        CriarRoda(bici.transform, "Roda_Tras", new Vector3(0f, 0.31f, -0.50f), 0.31f, 0.06f, matPneu, matAro);
        CriarRoda(bici.transform, "Roda_Frente", new Vector3(0f, 0.31f, 0.50f), 0.31f, 0.06f, matPneu, matAro);

        CriarCaixa("Quadro_Base", bici.transform, new Vector3(0f, 0.42f, -0.04f), new Vector3(0.06f, 0.06f, 0.72f), matQuadro, 1f, 1f, false, true);
        CriarCaixa("Quadro_Topo", bici.transform, new Vector3(0f, 0.68f, 0.02f), new Vector3(0.05f, 0.05f, 0.56f), matQuadro, 1f, 1f, false, false);

        GameObject garfo = CriarCilindro("Garfo", bici.transform, new Vector3(0f, 0.56f, 0.42f), 0.05f, 0.58f, matQuadro, false, 8);
        garfo.transform.localRotation = Quaternion.Euler(16f, 0f, 0f);

        GameObject canote = CriarCilindro("Canote", bici.transform, new Vector3(0f, 0.58f, -0.22f), 0.045f, 0.48f, matAro, false, 8);
        canote.transform.localRotation = Quaternion.Euler(-12f, 0f, 0f);

        CriarCaixa("Selim", bici.transform, new Vector3(0f, 0.83f, -0.26f), new Vector3(0.14f, 0.07f, 0.25f), matBanco, 1f, 1f, false, false);
        CriarCaixa("Guidao", bici.transform, new Vector3(0f, 0.86f, 0.35f), new Vector3(0.56f, 0.045f, 0.05f), matAro, 1f, 1f, false, false);
        CriarCaixa("Manopla_E", bici.transform, new Vector3(-0.26f, 0.86f, 0.35f), new Vector3(0.10f, 0.055f, 0.055f), matBanco, 1f, 1f, false, false);
        CriarCaixa("Manopla_D", bici.transform, new Vector3(0.26f, 0.86f, 0.35f), new Vector3(0.10f, 0.055f, 0.055f), matBanco, 1f, 1f, false, false);
        CriarCilindro("Pedal_Eixo", bici.transform, new Vector3(0f, 0.32f, -0.05f), 0.14f, 0.22f, matAro, false, 8)
            .transform.localRotation = Quaternion.Euler(0f, 0f, 90f);

        return bici;
    }

    private void CriarRoda(Transform pai, string nomeRoda, Vector3 pos, float raio, float largura, Material matPneu, Material matAro)
    {
        GameObject pivo = new GameObject(nomeRoda);
        pivo.transform.SetParent(pai, false);
        pivo.transform.localPosition = pos;

        GameObject pneu = CriarCilindro("Pneu", pivo.transform, Vector3.zero, raio * 2f, largura, matPneu, false, 12);
        pneu.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
        CriarCilindro("Calota", pneu.transform, Vector3.zero, raio * 1.1f, largura + 0.03f, matAro, false, 10);
    }

    private void ConstruirPedestres(Transform pai, float halfX, float halfZ, float pX, float pZ, List<CidadeSemaforoControlador> semaforos)
    {
        int baseQtd = Mathf.RoundToInt(40 * densidadePedestres);
        if (presetQualidade == PresetQualidade.Leve) baseQtd = Mathf.RoundToInt(baseQtd * 0.5f);
        else if (presetQualidade == PresetQualidade.Pesado) baseQtd = Mathf.RoundToInt(baseQtd * 1.35f);
        if (baseQtd <= 0) return;

        GameObject pedGrupo = new GameObject("Pedestres_Cidade");
        pedGrupo.transform.SetParent(pai, false);

        float[] ruasX = ObterCoordenadasRuasEtapa4(-halfX, pX, quadrasX);
        float[] ruasZ = ObterCoordenadasRuasEtapa4(-halfZ, pZ, quadrasZ);
        float calcadaOff = larguraRua * 0.5f + 0.65f;
        bool temRio = LerBoolEtapa4(true, "criarRio");

        for (int i = 0; i < baseQtd; i++)
        {
            bool ehParado = i % 6 == 0;
            bool eixoX = i % 2 == 0;
            int idxRua = eixoX ? Random.Range(0, ruasZ.Length) : Random.Range(0, ruasX.Length);
            int lado = (i % 4 < 2) ? 1 : -1;

            float x = eixoX ? Random.Range(-halfX + 6f, halfX - 6f) : ruasX[idxRua] + lado * calcadaOff;
            float z = eixoX ? ruasZ[idxRua] + lado * calcadaOff : Random.Range(-halfZ + 6f, halfZ - 6f);

            if (temRio && RetanguloSobreRio(x, z, 2.5f, 2.5f))
                continue;

            float y = AlturaTerrenoSeguraEtapa4(x, z);
            if (y < alturaChao + 0.05f) y = TopoCalcada(false);

            GameObject ped = ConstruirModeloPedestre(pedGrupo.transform, $"Pedestre_{i}", i,
                out Transform pernaE, out Transform pernaD, out Transform bracoE, out Transform bracoD);
            ped.transform.position = new Vector3(x, y, z);

            Vector3 dir = eixoX ? new Vector3(lado, 0f, 0f) : new Vector3(0f, 0f, lado);
            ped.transform.rotation = Quaternion.LookRotation(dir, Vector3.up);

            CidadePedestreAgente agente = ped.AddComponent<CidadePedestreAgente>();
            agente.Configurar(
                this,
                seedAleatoria + 4000 + i * 23,
                ehParado ? 0f : Random.Range(1.25f, 1.95f),
                ruasX,
                ruasZ,
                calcadaOff,
                halfX - 2f,
                halfZ - 2f,
                semaforos,
                pernaE, pernaD, bracoE, bracoD,
                ehParado
            );
            RegistrarObjetoDinamico(ped);
        }

        if (LerBoolEtapa4(true, "criarMorro"))
        {
            for (int m = 0; m < Mathf.Max(3, baseQtd / 6); m++)
            {
                float x, z;
                if (ladoMorro == LadoMorro.Leste)
                {
                    x = halfX + Random.Range(4f, 28f);
                    z = Random.Range(-halfZ * 0.6f, halfZ * 0.6f);
                }
                else if (ladoMorro == LadoMorro.Oeste)
                {
                    x = -halfX - Random.Range(4f, 28f);
                    z = Random.Range(-halfZ * 0.6f, halfZ * 0.6f);
                }
                else if (ladoMorro == LadoMorro.Sul)
                {
                    x = Random.Range(-halfX * 0.6f, halfX * 0.6f);
                    z = -halfZ - Random.Range(4f, 28f);
                }
                else
                {
                    x = Random.Range(-halfX * 0.6f, halfX * 0.6f);
                    z = halfZ + Random.Range(4f, 28f);
                }

                if (temRio && RetanguloSobreRio(x, z, 2.5f, 2.5f)) continue;

                float y = AlturaTerrenoSeguraEtapa4(x, z);
                GameObject ped = ConstruirModeloPedestre(pedGrupo.transform, $"Morador_Morro_{m}", m + 200,
                    out Transform pernaE, out Transform pernaD, out Transform bracoE, out Transform bracoD);
                ped.transform.position = new Vector3(x, y, z);
                CidadePedestreAgente ag = ped.AddComponent<CidadePedestreAgente>();
                ag.Configurar(this, seedAleatoria + 5000 + m, 1.25f, ruasX, ruasZ, calcadaOff, halfX + 35f, halfZ + 35f, semaforos, pernaE, pernaD, bracoE, bracoD, m % 2 == 0);
                RegistrarObjetoDinamico(ped);
            }
        }
    }

    private GameObject ConstruirModeloPedestre(Transform pai, string nome, int idx,
        out Transform pernaE, out Transform pernaD, out Transform bracoE, out Transform bracoD)
    {
        GameObject ped = new GameObject(nome);
        ped.transform.SetParent(pai, false);

        Color[] skins = { new Color(0.88f, 0.70f, 0.56f), new Color(0.68f, 0.46f, 0.32f), new Color(0.42f, 0.26f, 0.18f), new Color(0.92f, 0.78f, 0.66f) };
        Color[] roupas = { new Color(0.85f, 0.22f, 0.20f), new Color(0.20f, 0.48f, 0.85f), new Color(0.92f, 0.76f, 0.18f), new Color(0.24f, 0.64f, 0.40f), new Color(0.88f, 0.88f, 0.88f), new Color(0.60f, 0.26f, 0.68f) };
        Color[] calcas = { new Color(0.16f, 0.22f, 0.34f), new Color(0.20f, 0.20f, 0.22f), new Color(0.42f, 0.36f, 0.28f) };

        Material matSkin = MatCor(skins[idx % skins.Length], 0.15f);
        Material matCamisa = MatCor(roupas[Random.Range(0, roupas.Length)], 0.08f);
        Material matCalca = MatCor(calcas[idx % calcas.Length], 0.08f);
        Material matCabelo = MatCor(new Color(0.10f, 0.08f, 0.07f), 0.1f);

        GameObject pE = new GameObject("Perna_E"); pE.transform.SetParent(ped.transform, false); pE.transform.localPosition = new Vector3(-0.11f, 0.75f, 0f);
        GameObject pD = new GameObject("Perna_D"); pD.transform.SetParent(ped.transform, false); pD.transform.localPosition = new Vector3(0.11f, 0.75f, 0f);
        CriarCaixa("Geo_PernaE", pE.transform, new Vector3(0f, -0.37f, 0f), new Vector3(0.16f, 0.74f, 0.16f), matCalca, 1f, 1f, false, false);
        CriarCaixa("Geo_PernaD", pD.transform, new Vector3(0f, -0.37f, 0f), new Vector3(0.16f, 0.74f, 0.16f), matCalca, 1f, 1f, false, false);

        CriarCaixa("Torso", ped.transform, new Vector3(0f, 1.06f, 0f), new Vector3(0.42f, 0.58f, 0.24f), matCamisa, 1f, 1f, false, false);

        GameObject bE = new GameObject("Braco_E"); bE.transform.SetParent(ped.transform, false); bE.transform.localPosition = new Vector3(-0.28f, 1.30f, 0f);
        GameObject bD = new GameObject("Braco_D"); bD.transform.SetParent(ped.transform, false); bD.transform.localPosition = new Vector3(0.28f, 1.30f, 0f);
        CriarCaixa("Geo_BracoE", bE.transform, new Vector3(0f, -0.26f, 0f), new Vector3(0.13f, 0.52f, 0.13f), matCamisa, 1f, 1f, false, false);
        CriarCaixa("Geo_BracoD", bD.transform, new Vector3(0f, -0.26f, 0f), new Vector3(0.13f, 0.52f, 0.13f), matCamisa, 1f, 1f, false, false);

        CriarCaixa("Cabeca", ped.transform, new Vector3(0f, 1.52f, 0f), new Vector3(0.26f, 0.26f, 0.26f), matSkin, 1f, 1f, false, false);
        CriarCaixa("Cabelo", ped.transform, new Vector3(0f, 1.63f, -0.02f), new Vector3(0.28f, 0.10f, 0.28f), matCabelo, 1f, 1f, false, false);

        pernaE = pE.transform; pernaD = pD.transform;
        bracoE = bE.transform; bracoD = bD.transform;
        return ped;
    }

    private void ConstruirFauna(Transform pai, float halfX, float halfZ)
    {
        GameObject faunaGrupo = new GameObject("Fauna_Cidade");
        faunaGrupo.transform.SetParent(pai, false);

        Material matPombo = MatCor(new Color(0.56f, 0.58f, 0.62f), 0.1f);
        Material matBico = MatCor(new Color(0.88f, 0.64f, 0.18f), 0.1f);
        Material matPassaro = MatCor(new Color(0.18f, 0.18f, 0.20f), 0.1f);

        int pombos = presetQualidade == PresetQualidade.Leve ? 6 : 12;
        float yPraca = TopoCalcada(true) + 0.04f;
        for (int i = 0; i < pombos; i++)
        {
            GameObject pombo = new GameObject($"Pombo_{i}");
            pombo.transform.SetParent(faunaGrupo.transform, false);
            pombo.transform.position = new Vector3(Random.Range(-6f, 6f), yPraca, Random.Range(-6f, 6f));

            CriarCaixa("Corpo", pombo.transform, new Vector3(0f, 0.10f, 0f), new Vector3(0.14f, 0.12f, 0.24f), matPombo, 1f, 1f, false, false);
            CriarCaixa("Cabeca", pombo.transform, new Vector3(0f, 0.19f, 0.12f), new Vector3(0.08f, 0.08f, 0.09f), matPombo, 1f, 1f, false, false);
            CriarCaixa("Bico", pombo.transform, new Vector3(0f, 0.18f, 0.18f), new Vector3(0.03f, 0.03f, 0.06f), matBico, 1f, 1f, false, false);

            CidadeFaunaAgente fa = pombo.AddComponent<CidadeFaunaAgente>();
            fa.ConfigurarPombo(seedAleatoria + 6000 + i, Vector3.zero, 7.5f, yPraca);
            RegistrarObjetoDinamico(pombo);
        }

        int passaros = presetQualidade == PresetQualidade.Leve ? 5 : 10;
        for (int i = 0; i < passaros; i++)
        {
            GameObject ave = new GameObject($"Passaro_Ceu_{i}");
            ave.transform.SetParent(faunaGrupo.transform, false);

            CriarCaixa("Corpo", ave.transform, Vector3.zero, new Vector3(0.14f, 0.10f, 0.45f), matPassaro, 1f, 1f, false, false);
            GameObject asaE = CriarCaixa("Asa_E", ave.transform, new Vector3(-0.32f, 0.02f, 0f), new Vector3(0.56f, 0.03f, 0.22f), matPassaro, 1f, 1f, false, false);
            GameObject asaD = CriarCaixa("Asa_D", ave.transform, new Vector3(0.32f, 0.02f, 0f), new Vector3(0.56f, 0.03f, 0.22f), matPassaro, 1f, 1f, false, false);

            CidadeFaunaAgente fa = ave.AddComponent<CidadeFaunaAgente>();
            fa.ConfigurarPassaroCeu(seedAleatoria + 7000 + i,
                new Vector3(Random.Range(-halfX * 0.4f, halfX * 0.4f), Random.Range(28f, 48f), Random.Range(-halfZ * 0.4f, halfZ * 0.4f)),
                Random.Range(16f, 34f), Random.Range(0.22f, 0.42f), asaE.transform, asaD.transform);
            RegistrarObjetoDinamico(ave);
        }
    }

    private void ConstruirDetalhesFinaisRua(Transform pai, float halfX, float halfZ, float pX, float pZ)
    {
        GameObject detGrupo = new GameObject("Detalhes_Finais_Rua");
        detGrupo.transform.SetParent(pai, false);

        if (criarFiacaoRuasNormais)
        {
            Material matFio = MatCor(new Color(0.08f, 0.08f, 0.09f), 0.1f);
            float hFio = TopoCalcada(false) + 4.15f;
            float recuo = tamanhoQuadra * 0.5f - 0.45f;

            for (int gx = 0; gx < quadrasX; gx++)
            {
                for (int gz = 0; gz < quadrasZ; gz++)
                {
                    if ((gx + gz) % 2 != 0) continue;
                    float cx = -halfX + larguraRua + gx * pX + tamanhoQuadra * 0.5f;
                    float cz = -halfZ + larguraRua + gz * pZ + tamanhoQuadra * 0.5f;

                    Vector3 a = new Vector3(cx - recuo * 0.5f, hFio, cz + recuo);
                    Vector3 b = new Vector3(cx + recuo * 0.5f, hFio, cz + recuo);
                    CriarFioRua(detGrupo.transform, $"Fio_Quadra_{gx}_{gz}", a, b, matFio);
                }
            }
        }

        if (criarPlacasEVapor)
        {
            Material matPostePlaca = MatCor(new Color(0.55f, 0.57f, 0.60f), 0.4f);
            Material matPlacaVerde = MatCor(new Color(0.12f, 0.48f, 0.24f), 0.2f);
            Material matPlacaPare = MatCor(new Color(0.82f, 0.14f, 0.14f), 0.2f);

            float[] ruasX = ObterCoordenadasRuasEtapa4(-halfX, pX, quadrasX);
            float[] ruasZ = ObterCoordenadasRuasEtapa4(-halfZ, pZ, quadrasZ);

            for (int i = 1; i < ruasX.Length - 1; i += 2)
            {
                Vector3 pPlaca = new Vector3(ruasX[i] + larguraRua * 0.5f + 0.55f, TopoCalcada(false), ruasZ[ruasZ.Length / 2] + larguraRua * 0.5f + 0.55f);
                CriarCilindro($"Haste_Placa_{i}", detGrupo.transform, pPlaca + Vector3.up * 1.35f, 0.045f, 2.7f, matPostePlaca, true, 8);
                CriarCaixa("Tabuleta_Rua", detGrupo.transform, pPlaca + Vector3.up * 2.55f, new Vector3(0.95f, 0.34f, 0.06f), i % 3 == 0 ? matPlacaPare : matPlacaVerde, 1f, 1f, false, false);
            }

            int qtdVapor = presetQualidade == PresetQualidade.Leve ? 2 : 4;
            Shader shPart = EscolherShaderParticulaEtapa4();
            Material matVapor = new Material(shPart) { name = "Cidade_VaporBueiro" };
            if (matVapor.HasProperty("_BaseColor")) matVapor.SetColor("_BaseColor", new Color(0.88f, 0.90f, 0.94f, 0.25f));
            if (matVapor.HasProperty("_Color")) matVapor.SetColor("_Color", new Color(0.88f, 0.90f, 0.94f, 0.25f));
            materiaisGerados.Add(matVapor);

            for (int v = 0; v < qtdVapor; v++)
            {
                GameObject vapObj = new GameObject($"Vapor_Bueiro_{v}");
                vapObj.transform.SetParent(detGrupo.transform, false);
                vapObj.transform.position = new Vector3(ruasX[Mathf.Clamp(v + 1, 0, ruasX.Length - 1)] + 1.8f, TopoAsfalto + 0.05f, ruasZ[ruasZ.Length / 2] - 2.0f);

                ParticleSystem ps = vapObj.AddComponent<ParticleSystem>();
                var main = ps.main;
                main.startLifetime = 2.6f;
                main.startSpeed = 0.65f;
                main.startSize = new ParticleSystem.MinMaxCurve(0.4f, 1.1f);
                main.startColor = new Color(0.88f, 0.90f, 0.94f, 0.24f);
                main.maxParticles = 24;

                var em = ps.emission;
                em.rateOverTime = 5f;

                var shape = ps.shape;
                shape.shapeType = ParticleSystemShapeType.Circle;
                shape.radius = 0.35f;

                var rend = vapObj.GetComponent<ParticleSystemRenderer>();
                rend.sharedMaterial = matVapor;

                RegistrarParticula(ps);
                RegistrarObjetoDinamico(vapObj);
            }
        }
    }

    private void CriarFioRua(Transform pai, string nome, Vector3 a, Vector3 b, Material mat)
    {
        GameObject obj = new GameObject(nome);
        obj.transform.SetParent(pai, false);
        LineRenderer lr = obj.AddComponent<LineRenderer>();
        lr.useWorldSpace = false;
        lr.positionCount = 5;
        lr.startWidth = 0.03f;
        lr.endWidth = 0.03f;
        lr.sharedMaterial = mat;
        lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        lr.receiveShadows = false;
        for (int i = 0; i < 5; i++)
        {
            float t = i / 4f;
            Vector3 p = Vector3.Lerp(a, b, t);
            p.y -= 1.4f * t * (1f - t);
            lr.SetPosition(i, p);
        }
        RegistrarLinha(lr);
    }

    private void ConfigurarCicloDiaNoite(Transform pai, List<Vector3> posLampadas, List<Material> matFarois, List<Material> matLanternas)
    {
        texJanelasEmissao = NovaTextura("TexJanelasEmissao", 64, (x, y) =>
        {
            int cx = x / 16;
            int cy = y / 16;
            int lx = x % 16;
            int ly = y % 16;
            if (lx < 3 || lx >= 13 || ly < 3 || ly >= 13) return Cor(0f, 0f, 0f);

            float h = Hash(cx, cy, seedAleatoria + 901);
            if (h > 0.36f) return Cor(0f, 0f, 0f);

            if (h < 0.24f) return Cor(1.0f, 0.82f, 0.48f);
            return Cor(0.75f, 0.90f, 1.0f);
        });

        List<Material> materiaisJanelas = new List<Material>();
        List<Material> materiaisLuminosos = new List<Material>();

        for (int i = 0; i < materiaisGerados.Count; i++)
        {
            Material m = materiaisGerados[i];
            if (m == null) continue;

            if (m.name.Contains("fachada_"))
            {
                if (m.HasProperty("_EmissionMap")) m.SetTexture("_EmissionMap", texJanelasEmissao);
                if (m.HasProperty("_EmissiveColorMap")) m.SetTexture("_EmissiveColorMap", texJanelasEmissao);
                if (m.HasProperty("_EmissionColor"))
                {
                    m.EnableKeyword("_EMISSION");
                    m.SetColor("_EmissionColor", Color.black);
                }
                materiaisJanelas.Add(m);
            }
            else if (m.name.Contains("lampada") || m.name.Contains("neon") || m.name.Contains("luminaria"))
            {
                materiaisLuminosos.Add(m);
            }
        }

        List<Light> poolLuzes = new List<Light>();
        int nLuzes = presetQualidade == PresetQualidade.Leve ? Mathf.Min(3, maxLuzesPoolNoturnas) : maxLuzesPoolNoturnas;
        for (int i = 0; i < nLuzes; i++)
        {
            GameObject lObj = new GameObject($"Luz_Pool_Noturna_{i}");
            lObj.transform.SetParent(pai, false);
            Light l = lObj.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = new Color(1.0f, 0.82f, 0.52f);
            l.range = 19f;
            l.intensity = 0f;
            l.shadows = LightShadows.None;
            poolLuzes.Add(l);
            RegistrarLuz(l);
            RegistrarObjetoDinamico(lObj);
        }

        GameObject cicloObj = new GameObject("Controlador_Dia_Noite");
        cicloObj.transform.SetParent(pai, false);
        CidadeCicloDiaNoite ciclo = cicloObj.AddComponent<CidadeCicloDiaNoite>();
        ciclo.Configurar(
            horaInicial,
            duracaoDiaSegundos,
            congelarHora,
            materiaisJanelas,
            materiaisLuminosos,
            matFarois,
            matLanternas,
            posLampadas,
            poolLuzes
        );
        RegistrarObjetoDinamico(cicloObj);
    }

    private void ConfigurarClimaChuva(Transform pai)
    {
        GameObject climaObj = new GameObject("Controlador_Clima_Chuva");
        climaObj.transform.SetParent(pai, false);

        Shader shPart = EscolherShaderParticulaEtapa4();
        Material matChuva = new Material(shPart) { name = "Cidade_GotasChuva" };
        if (matChuva.HasProperty("_BaseColor")) matChuva.SetColor("_BaseColor", new Color(0.75f, 0.82f, 0.92f, 0.45f));
        if (matChuva.HasProperty("_Color")) matChuva.SetColor("_Color", new Color(0.75f, 0.82f, 0.92f, 0.45f));
        materiaisGerados.Add(matChuva);

        ParticleSystem ps = climaObj.AddComponent<ParticleSystem>();
        var main = ps.main;
        main.startLifetime = 1.0f;
        main.startSpeed = 24f;
        main.startSize = 0.08f;
        main.startColor = new Color(0.78f, 0.86f, 0.95f, 0.45f);
        main.maxParticles = 1200;

        var em = ps.emission;
        em.rateOverTime = 750f * intensidadeChuva;

        var shape = ps.shape;
        shape.shapeType = ParticleSystemShapeType.Box;
        shape.scale = new Vector3(44f, 1f, 44f);

        var rend = climaObj.GetComponent<ParticleSystemRenderer>();
        rend.renderMode = ParticleSystemRenderMode.Stretch;
        rend.lengthScale = 6f;
        rend.sharedMaterial = matChuva;

        RegistrarParticula(ps);

        List<Material> matsMolhaveis = new List<Material>();
        for (int i = 0; i < materiaisGerados.Count; i++)
        {
            Material m = materiaisGerados[i];
            if (m != null && (m.name.Contains("asfalto") || m.name.Contains("calcada")))
                matsMolhaveis.Add(m);
        }

        CidadeClimaVFX clima = climaObj.AddComponent<CidadeClimaVFX>();
        clima.Configurar(ps, chuvaAtiva, intensidadeChuva, matsMolhaveis);
        RegistrarObjetoDinamico(climaObj);
    }

    private void ObterDimensoesEtapa4(out float halfX, out float halfZ, out float pX, out float pZ)
    {
        pX = tamanhoQuadra + larguraRua;
        pZ = tamanhoQuadra + larguraRua;
        float lx = larguraTotal > 0 ? (float)larguraTotal : (quadrasX * tamanhoQuadra + (quadrasX + 1) * larguraRua);
        float lz = comprimentoTotal > 0 ? (float)comprimentoTotal : (quadrasZ * tamanhoQuadra + (quadrasZ + 1) * larguraRua);
        halfX = lx * 0.5f;
        halfZ = lz * 0.5f;
    }

    private float[] ObterCoordenadasRuasEtapa4(float inicio, float passo, int quadras)
    {
        float[] arr = new float[quadras + 1];
        for (int k = 0; k <= quadras; k++)
            arr[k] = inicio + larguraRua * 0.5f + k * passo;
        return arr;
    }

    private float AlturaTerrenoSeguraEtapa4(float x, float z)
    {
        MethodInfo m = GetType().GetMethod("AlturaTerreno", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        if (m != null)
        {
            object r = m.Invoke(this, new object[] { x, z });
            if (r is float f) return f;
        }
        return alturaChao;
    }

    private static List<CidadeSemaforoControlador> ColetarSemaforosEtapa4(Transform raiz)
    {
        List<CidadeSemaforoControlador> lista = new List<CidadeSemaforoControlador>();
        if (raiz != null) raiz.GetComponentsInChildren(true, lista);
        return lista;
    }

    private static List<Vector3> ColetarPosicoesLampadasEtapa4(Transform raiz)
    {
        List<Vector3> pts = new List<Vector3>();
        if (raiz == null) return pts;
        Transform[] todos = raiz.GetComponentsInChildren<Transform>(true);
        for (int i = 0; i < todos.Length; i++)
        {
            if (todos[i].name.Contains("Lampada"))
                pts.Add(todos[i].position);
        }
        return pts;
    }

    private Shader EscolherShaderParticulaEtapa4()
    {
        string[] nomes =
        {
            "Universal Render Pipeline/Particles/Unlit",
            "Particles/Standard Unlit",
            "Sprites/Default"
        };
        for (int i = 0; i < nomes.Length; i++)
        {
            Shader s = Shader.Find(nomes[i]);
            if (s != null && s.isSupported) return s;
        }
        return Shader.Find("Sprites/Default");
    }

    private bool LerBoolEtapa4(bool padrao, params string[] nomes)
    {
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        for (int i = 0; i < nomes.Length; i++)
        {
            FieldInfo f = GetType().GetField(nomes[i], flags);
            if (f != null && f.FieldType == typeof(bool)) return (bool)f.GetValue(this);
        }
        return padrao;
    }
}