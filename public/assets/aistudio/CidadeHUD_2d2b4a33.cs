using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

public class CidadeHUD : MonoBehaviour
{
    public static CidadeHUD Instancia { get; private set; }

    private int dinheiro = 1250;
    private int estrelasProcurado;
    private float timerEstrela;
    private bool mostrarAjuda = true;

    private MovimentoJogador jogador;
    private GeradorCidadeInicial gerador;
    private CidadeCicloDiaNoite cicloDia;
    private CidadeClimaVFX climaVfx;

    private Font fonteUI;
    private Image barraVida, barraColete, barraStamina, barraRpm;
    private Text txtDinheiro, txtHoraClima, txtBairro, txtEstrelas, txtVelocidade, txtMarcha, txtVeiculoNome, txtPrompt, txtNotificacao;
    private GameObject painelVelocimetro, painelPrompt, painelAjuda;
    private float timerNotif;

    // Minimapa Radar
    private RectTransform mapaConteudo, aroBussola;
    private RawImage mapaImg;
    private float escalaMapaPxPorMetro = 1.6f;
    private float tamanhoCidadeMetros = 240f;
    private readonly List<Image> blipsPool = new List<Image>();
    private float timerBlips;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void AutoIniciar()
    {
        if (Instancia != null) return;
        GameObject go = new GameObject("Cidade_HUD_Sistema");
        go.AddComponent<CidadeHUD>();
    }

    public static void RegistrarRoubo(string nomeVeiculo)
    {
        if (Instancia == null) return;
        Instancia.estrelasProcurado = Mathf.Min(5, Instancia.estrelasProcurado + 1);
        Instancia.timerEstrela = 18f;
        Instancia.dinheiro += 150;
        Notificar($"Veículo roubado ({nomeVeiculo})! +$150 | Procurado!");
    }

    public static void Notificar(string msg)
    {
        if (Instancia == null || Instancia.txtNotificacao == null) return;
        Instancia.txtNotificacao.text = msg;
        Instancia.txtNotificacao.gameObject.SetActive(true);
        Instancia.timerNotif = 4.2f;
    }

    private void Awake()
    {
        if (Instancia != null && Instancia != this) { Destroy(gameObject); return; }
        Instancia = this;
        CarregarFonte();
        ConstruirHUD();
    }

    private void Start()
    {
        EncontrarReferencias();
        GerarTexturaMinimapa();
    }

    private void CarregarFonte()
    {
        try { fonteUI = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); } catch { }
        if (fonteUI == null)
        {
            try { fonteUI = Resources.GetBuiltinResource<Font>("Arial.ttf"); } catch { }
        }
    }

    private void EncontrarReferencias()
    {
#if UNITY_2023_1_OR_NEWER
        if (jogador == null) jogador = FindAnyObjectByType<MovimentoJogador>();
        if (gerador == null) gerador = FindAnyObjectByType<GeradorCidadeInicial>();
        if (cicloDia == null) cicloDia = FindAnyObjectByType<CidadeCicloDiaNoite>();
        if (climaVfx == null) climaVfx = FindAnyObjectByType<CidadeClimaVFX>();
#else
        if (jogador == null) jogador = FindObjectOfType<MovimentoJogador>();
        if (gerador == null) gerador = FindObjectOfType<GeradorCidadeInicial>();
        if (cicloDia == null) cicloDia = FindObjectOfType<CidadeCicloDiaNoite>();
        if (climaVfx == null) climaVfx = FindObjectOfType<CidadeClimaVFX>();
#endif
    }

    private void Update()
    {
        if (jogador == null || gerador == null) EncontrarReferencias();

        if (LerTeclaH() && painelAjuda != null)
        {
            mostrarAjuda = !mostrarAjuda;
            painelAjuda.SetActive(mostrarAjuda);
        }

        AtualizarStatusJogador();
        AtualizarTempoClimaBairro();
        AtualizarVelocimetroEPrompt();
        AtualizarMinimapa();

        if (timerNotif > 0f)
        {
            timerNotif -= Time.deltaTime;
            if (timerNotif <= 0f && txtNotificacao != null)
                txtNotificacao.gameObject.SetActive(false);
        }

        if (estrelasProcurado > 0)
        {
            timerEstrela -= Time.deltaTime;
            if (timerEstrela <= 0f)
            {
                estrelasProcurado--;
                timerEstrela = 14f;
            }
        }
    }

    private void AtualizarStatusJogador()
    {
        if (jogador != null)
        {
            barraVida.fillAmount = Mathf.Clamp01(jogador.vidaAtual / Mathf.Max(1f, jogador.vidaMax));
            barraColete.fillAmount = Mathf.Clamp01(jogador.coleteAtual / Mathf.Max(1f, jogador.coleteMax));
            float stam = Mathf.Clamp01(jogador.staminaAtual / Mathf.Max(1f, jogador.staminaMax));
            barraStamina.fillAmount = stam;
            barraStamina.color = stam < 0.25f
                ? Color.Lerp(new Color(0.95f, 0.25f, 0.20f), new Color(0.98f, 0.80f, 0.15f), Mathf.PingPong(Time.time * 6f, 1f))
                : new Color(0.96f, 0.78f, 0.16f);
        }

        txtDinheiro.text = $"$ {dinheiro:N0}";
        if (estrelasProcurado > 0)
        {
            string s = "";
            for (int i = 0; i < 5; i++) s += i < estrelasProcurado ? "★" : "☆";
            txtEstrelas.text = s;
            txtEstrelas.color = Mathf.PingPong(Time.time * 4f, 1f) > 0.5f
                ? new Color(1f, 0.25f, 0.25f)
                : new Color(0.25f, 0.58f, 1f);
        }
        else
        {
            txtEstrelas.text = "☆☆☆☆☆";
            txtEstrelas.color = new Color(1f, 1f, 1f, 0.25f);
        }
    }

    private void AtualizarTempoClimaBairro()
    {
        float h = cicloDia != null ? cicloDia.horaAtual : 12f;
        int hh = Mathf.FloorToInt(h) % 24;
        int mm = Mathf.FloorToInt((h - Mathf.Floor(h)) * 60f);
        string clima = (climaVfx != null && climaVfx.chuvaAtiva) ? "Chuvoso" : (hh >= 6 && hh < 18 ? "Ensolarado" : "Noite");
        txtHoraClima.text = $"{hh:00}:{mm:00}  •  {clima}";

        Vector3 p = ObterPosicaoAlvo();
        txtBairro.text = DescobrirBairro(p);
    }

    private string DescobrirBairro(Vector3 p)
    {
        if (gerador == null) return "Cidade";
        float hx = (gerador.quadrasX * gerador.tamanhoQuadra + (gerador.quadrasX + 1) * gerador.larguraRua) * 0.5f;
        float hz = (gerador.quadrasZ * gerador.tamanhoQuadra + (gerador.quadrasZ + 1) * gerador.larguraRua) * 0.5f;

        if (gerador.criarMorro)
        {
            if (gerador.ladoMorro == GeradorCidadeInicial.LadoMorro.Leste && p.x > hx) return "Morro da Comunidade";
            if (gerador.ladoMorro == GeradorCidadeInicial.LadoMorro.Oeste && p.x < -hx) return "Morro da Comunidade";
            if (gerador.ladoMorro == GeradorCidadeInicial.LadoMorro.Norte && p.z > hz) return "Morro da Comunidade";
            if (gerador.ladoMorro == GeradorCidadeInicial.LadoMorro.Sul && p.z < -hz) return "Morro da Comunidade";
        }
        if (Mathf.Abs(p.x) > hx + 2f || Mathf.Abs(p.z) > hz + 2f) return "Arredores";
        if (gerador.criarRio && gerador.RetanguloSobreRio(p.x, p.z, 12f, 12f)) return "Beira-Rio / Orla";

        int gx = Mathf.Clamp(Mathf.FloorToInt((p.x + hx) / (gerador.tamanhoQuadra + gerador.larguraRua)), 0, gerador.quadrasX - 1);
        int gz = Mathf.Clamp(Mathf.FloorToInt((p.z + hz) / (gerador.tamanhoQuadra + gerador.larguraRua)), 0, gerador.quadrasZ - 1);
        if (gx == gerador.quadrasX / 2 && gz == gerador.quadrasZ / 2) return "Praça Central";

        switch (gerador.DistritoDe(gx, gz))
        {
            case GeradorCidadeInicial.Distrito.Shopping: return "Shopping Center";
            case GeradorCidadeInicial.Distrito.Centro: return "Centro Financeiro";
            case GeradorCidadeInicial.Distrito.Comercial: return "Zona Comercial";
            case GeradorCidadeInicial.Distrito.Industrial: return "Porto & Indústrias";
            case GeradorCidadeInicial.Distrito.Orla: return "Orla & Cais";
            default: return "Bairro Residencial";
        }
    }

    private void AtualizarVelocimetroEPrompt()
    {
        var sis = SistemaVeiculosEInteracao.Instancia;
        bool dirigindo = sis != null && sis.EstaDirigindo && sis.VeiculoAtual != null;

        painelVelocimetro.SetActive(dirigindo);
        if (dirigindo)
        {
            CarroControle cc = sis.VeiculoAtual.Controle;
            txtVelocidade.text = Mathf.RoundToInt(cc.VelocidadeKmh).ToString("000");
            txtMarcha.text = cc.MarchaAtual < 0 ? "R" : (cc.MarchaAtual == 0 ? "N" : cc.MarchaAtual.ToString());
            txtVeiculoNome.text = $"{sis.VeiculoAtual.NomeAmigavel.ToUpper()}  {(cc.Freando ? "[FREIO]" : (cc.TurboAtivo ? "[TURBO]" : ""))}";
            barraRpm.fillAmount = Mathf.Clamp01(cc.RpmNormalizado);
            barraRpm.color = Color.Lerp(new Color(0.2f, 0.9f, 0.4f), new Color(1f, 0.25f, 0.15f), cc.RpmNormalizado);

            painelPrompt.SetActive(true);
            txtPrompt.text = "[F] Sair do Veículo";
        }
        else if (sis != null && sis.VeiculoMaisProximo != null)
        {
            painelPrompt.SetActive(true);
            var v = sis.VeiculoMaisProximo;
            string acao = v.TemMotoristaNPC ? "Roubar" : (v.Categoria == CategoriaVeiculoInteracao.Moto || v.Categoria == CategoriaVeiculoInteracao.Bicicleta ? "Subir em" : "Entrar em");
            txtPrompt.text = $"[F] {acao} {v.NomeAmigavel}";
        }
        else
        {
            painelPrompt.SetActive(false);
        }
    }

    private void AtualizarMinimapa()
    {
        if (mapaConteudo == null) return;

        Vector3 p = ObterPosicaoAlvo();
        float yawCam = Camera.main != null ? Camera.main.transform.eulerAngles.y : 0f;

        // Gira a bússola e o mapa conforme a câmera
        aroBussola.localRotation = Quaternion.Euler(0f, 0f, yawCam);
        mapaConteudo.localRotation = Quaternion.Euler(0f, 0f, yawCam);

        Vector2 posNoMapa = new Vector2(-p.x * escalaMapaPxPorMetro, -p.z * escalaMapaPxPorMetro);
        mapaImg.rectTransform.anchoredPosition = posNoMapa;

        timerBlips -= Time.deltaTime;
        if (timerBlips <= 0f)
        {
            timerBlips = 0.15f;
            AtualizarBlipsRadar(p);
        }
    }

    private void AtualizarBlipsRadar(Vector3 centro)
    {
        int usados = 0;
#if UNITY_2023_1_OR_NEWER
        VeiculoInterativo[] vs = FindObjectsByType<VeiculoInterativo>();
#else
        VeiculoInterativo[] vs = FindObjectsOfType<VeiculoInterativo>();
#endif
        for (int i = 0; i < vs.Length && usados < 24; i++)
        {
            if (vs[i] == null) continue;
            Vector3 d = vs[i].transform.position - centro;
            if (d.sqrMagnitude > 65f * 65f) continue;

            Image blip = ObterBlip(usados++);
            blip.color = vs[i].Categoria == CategoriaVeiculoInteracao.Bicicleta ? Color.cyan :
                         (vs[i].Categoria == CategoriaVeiculoInteracao.Moto ? new Color(1f, 0.65f, 0.1f) : new Color(0.95f, 0.90f, 0.25f));
            blip.rectTransform.anchoredPosition = new Vector2(d.x * escalaMapaPxPorMetro, d.z * escalaMapaPxPorMetro);
        }

        for (int i = usados; i < blipsPool.Count; i++)
            blipsPool[i].gameObject.SetActive(false);
    }

    private Image ObterBlip(int idx)
    {
        while (blipsPool.Count <= idx)
        {
            GameObject b = new GameObject("Blip");
            b.transform.SetParent(mapaConteudo, false);
            Image img = b.AddComponent<Image>();
            RectTransform rt = img.rectTransform;
            rt.sizeDelta = new Vector2(5f, 5f);
            blipsPool.Add(img);
        }
        blipsPool[idx].gameObject.SetActive(true);
        return blipsPool[idx];
    }

    private Vector3 ObterPosicaoAlvo()
    {
        var sis = SistemaVeiculosEInteracao.Instancia;
        if (sis != null && sis.EstaDirigindo && sis.VeiculoAtual != null)
            return sis.VeiculoAtual.transform.position;
        return jogador != null ? jogador.transform.position : Vector3.zero;
    }

    private void GerarTexturaMinimapa()
    {
        if (gerador == null) return;
        float lx = gerador.quadrasX * gerador.tamanhoQuadra + (gerador.quadrasX + 1) * gerador.larguraRua;
        float lz = gerador.quadrasZ * gerador.tamanhoQuadra + (gerador.quadrasZ + 1) * gerador.larguraRua;
        tamanhoCidadeMetros = Mathf.Max(lx, lz) + 120f;

        int res = 256;
        Texture2D tex = new Texture2D(res, res, TextureFormat.RGBA32, false) { filterMode = FilterMode.Bilinear };
        Color32[] px = new Color32[res * res];

        float hx = lx * 0.5f, hz = lz * 0.5f;
        float pX = gerador.tamanhoQuadra + gerador.larguraRua;
        float pZ = gerador.tamanhoQuadra + gerador.larguraRua;

        for (int y = 0; y < res; y++)
        {
            float wz = Mathf.Lerp(-tamanhoCidadeMetros * 0.5f, tamanhoCidadeMetros * 0.5f, y / (float)(res - 1));
            for (int x = 0; x < res; x++)
            {
                float wx = Mathf.Lerp(-tamanhoCidadeMetros * 0.5f, tamanhoCidadeMetros * 0.5f, x / (float)(res - 1));
                Color c = new Color(0.16f, 0.24f, 0.14f, 1f); // entorno verde escuro

                if (gerador.criarRio && gerador.RetanguloSobreRio(wx, wz, 0.5f, 0.5f))
                {
                    c = new Color(0.14f, 0.48f, 0.72f, 1f);
                }
                else if (Mathf.Abs(wx) <= hx && Mathf.Abs(wz) <= hz)
                {
                    float rx = Mathf.Repeat(wx + hx, pX);
                    float rz = Mathf.Repeat(wz + hz, pZ);
                    if (rx < gerador.larguraRua || rz < gerador.larguraRua)
                        c = new Color(0.14f, 0.15f, 0.17f, 1f); // rua
                    else
                    {
                        int gx = Mathf.Clamp(Mathf.FloorToInt((wx + hx) / pX), 0, gerador.quadrasX - 1);
                        int gz = Mathf.Clamp(Mathf.FloorToInt((wz + hz) / pZ), 0, gerador.quadrasZ - 1);
                        if (gx == gerador.quadrasX / 2 && gz == gerador.quadrasZ / 2)
                            c = new Color(0.24f, 0.56f, 0.28f, 1f); // praça
                        else if (gerador.DistritoDe(gx, gz) == GeradorCidadeInicial.Distrito.Shopping)
                            c = new Color(0.42f, 0.36f, 0.52f, 1f);
                        else
                            c = new Color(0.32f, 0.34f, 0.37f, 1f); // quadra
                    }
                }
                else if (gerador.criarMorro)
                {
                    if ((gerador.ladoMorro == GeradorCidadeInicial.LadoMorro.Leste && wx > hx) ||
                        (gerador.ladoMorro == GeradorCidadeInicial.LadoMorro.Oeste && wx < -hx) ||
                        (gerador.ladoMorro == GeradorCidadeInicial.LadoMorro.Norte && wz > hz) ||
                        (gerador.ladoMorro == GeradorCidadeInicial.LadoMorro.Sul && wz < -hz))
                        c = new Color(0.34f, 0.28f, 0.20f, 1f); // morro
                }
                px[y * res + x] = c;
            }
        }
        tex.SetPixels32(px);
        tex.Apply();

        mapaImg.texture = tex;
        float mapaSizePx = tamanhoCidadeMetros * escalaMapaPxPorMetro;
        mapaImg.rectTransform.sizeDelta = new Vector2(mapaSizePx, mapaSizePx);
    }

    // ============================================================
    // CONSTRUÇÃO PROCEDURAL DA INTERFACE (ZERO ASSETS EXTERNOS)
    // ============================================================
    private void ConstruirHUD()
    {
        GameObject canvasObj = new GameObject("Canvas_HUD_GTA");
        canvasObj.transform.SetParent(transform, false);
        Canvas cv = canvasObj.AddComponent<Canvas>();
        cv.renderMode = RenderMode.ScreenSpaceOverlay;
        cv.sortingOrder = 50;

        CanvasScaler cs = canvasObj.AddComponent<CanvasScaler>();
        cs.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        cs.referenceResolution = new Vector2(1920f, 1080f);
        cs.matchWidthOrHeight = 0.5f;
        canvasObj.AddComponent<GraphicRaycaster>();

        // 1) TOPO DIREITO: Dinheiro, Estrelas, Hora, Clima e Bairro
        RectTransform topDir = CriarPainel(canvasObj.transform, "Painel_TopDir", new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-24f, -24f), new Vector2(360f, 150f), new Color(0.06f, 0.07f, 0.09f, 0.72f));
        txtDinheiro = CriarTexto(topDir, "$ 1,250", 30, TextAnchor.UpperRight, new Vector2(-16f, -12f), new Vector2(320f, 40f), new Color(0.30f, 0.88f, 0.42f));
        txtEstrelas = CriarTexto(topDir, "☆☆☆☆☆", 26, TextAnchor.UpperRight, new Vector2(-16f, -48f), new Vector2(320f, 34f), Color.white);
        txtHoraClima = CriarTexto(topDir, "16:30  •  Ensolarado", 18, TextAnchor.UpperRight, new Vector2(-16f, -86f), new Vector2(320f, 26f), new Color(0.88f, 0.90f, 0.94f));
        txtBairro = CriarTexto(topDir, "Praça Central", 20, TextAnchor.UpperRight, new Vector2(-16f, -114f), new Vector2(320f, 28f), new Color(0.98f, 0.78f, 0.22f));

        // 2) CANTO INFERIOR ESQUERDO: Radar + Barras de Vida, Colete e Fôlego
        RectTransform radarBox = CriarPainel(canvasObj.transform, "Radar_Box", new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(24f, 24f), new Vector2(230f, 264f), new Color(0.06f, 0.07f, 0.09f, 0.80f));
        GameObject maskGo = new GameObject("Radar_Mask");
        maskGo.transform.SetParent(radarBox, false);
        RectTransform maskRt = maskGo.AddComponent<RectTransform>();
        maskRt.anchorMin = new Vector2(0.5f, 1f);
        maskRt.anchorMax = new Vector2(0.5f, 1f);
        maskRt.pivot = new Vector2(0.5f, 1f);
        maskRt.anchoredPosition = new Vector2(0f, -10f);
        maskRt.sizeDelta = new Vector2(210f, 210f);
        maskGo.AddComponent<Image>().color = new Color(0.10f, 0.12f, 0.14f, 1f);
        maskGo.AddComponent<Mask>().showMaskGraphic = true;

        GameObject mapCont = new GameObject("Mapa_Rotacao");
        mapCont.transform.SetParent(maskRt, false);
        mapaConteudo = mapCont.AddComponent<RectTransform>();
        mapaConteudo.sizeDelta = new Vector2(210f, 210f);

        GameObject rawGo = new GameObject("Mapa_Tex");
        rawGo.transform.SetParent(mapaConteudo, false);
        mapaImg = rawGo.AddComponent<RawImage>();
        mapaImg.rectTransform.sizeDelta = new Vector2(400f, 400f);

        // Seta central do jogador no radar
        GameObject seta = new GameObject("Player_Seta");
        seta.transform.SetParent(maskRt, false);
        Image imgSeta = seta.AddComponent<Image>();
        imgSeta.color = Color.white;
        imgSeta.rectTransform.sizeDelta = new Vector2(10f, 12f);

        // Indicador Norte (N) giratório
        GameObject buss = new GameObject("Bussola_N");
        buss.transform.SetParent(maskRt, false);
        aroBussola = buss.AddComponent<RectTransform>();
        aroBussola.sizeDelta = new Vector2(204f, 204f);
        Text txtN = CriarTexto(aroBussola, "N", 16, TextAnchor.MiddleCenter, new Vector2(0f, 92f), new Vector2(24f, 24f), new Color(1f, 0.35f, 0.25f));
        txtN.rectTransform.anchorMin = txtN.rectTransform.anchorMax = txtN.rectTransform.pivot = new Vector2(0.5f, 0.5f);
        txtN.rectTransform.anchoredPosition = new Vector2(0f, 92f);

        // Barras sob o minimapa
        barraVida = CriarBarra(radarBox, new Vector2(10f, 24f), new Vector2(68f, 12f), new Color(0.24f, 0.82f, 0.36f));
        barraColete = CriarBarra(radarBox, new Vector2(82f, 24f), new Vector2(66f, 12f), new Color(0.22f, 0.64f, 0.96f));
        barraStamina = CriarBarra(radarBox, new Vector2(152f, 24f), new Vector2(68f, 12f), new Color(0.96f, 0.78f, 0.16f));

        // 3) CANTO INFERIOR DIREITO: Velocímetro
        RectTransform velBox = CriarPainel(canvasObj.transform, "Painel_Velocimetro", new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(-24f, 24f), new Vector2(290f, 125f), new Color(0.06f, 0.07f, 0.09f, 0.80f));
        painelVelocimetro = velBox.gameObject;
        txtVeiculoNome = CriarTexto(velBox, "CARRO", 15, TextAnchor.UpperLeft, new Vector2(14f, -10f), new Vector2(260f, 22f), new Color(0.82f, 0.86f, 0.92f));
        txtVelocidade = CriarTexto(velBox, "000", 48, TextAnchor.LowerLeft, new Vector2(14f, -72f), new Vector2(140f, 56f), Color.white);
        CriarTexto(velBox, "KM/H", 16, TextAnchor.LowerLeft, new Vector2(118f, -66f), new Vector2(60f, 24f), new Color(0.75f, 0.78f, 0.82f));
        txtMarcha = CriarTexto(velBox, "N", 34, TextAnchor.LowerRight, new Vector2(-16f, -68f), new Vector2(60f, 44f), new Color(0.98f, 0.78f, 0.20f));
        barraRpm = CriarBarra(velBox, new Vector2(14f, 14f), new Vector2(262f, 10f), new Color(0.24f, 0.85f, 0.42f));
        painelVelocimetro.SetActive(false);

        // 4) CENTRO INFERIOR: Prompt de interação + Notificação
        RectTransform promptBox = CriarPainel(canvasObj.transform, "Painel_Prompt", new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0f, 90f), new Vector2(360f, 44f), new Color(0.05f, 0.06f, 0.08f, 0.85f));
        promptBox.pivot = new Vector2(0.5f, 0f);
        painelPrompt = promptBox.gameObject;
        txtPrompt = CriarTexto(promptBox, "[F] Entrar no Carro", 20, TextAnchor.MiddleCenter, Vector2.zero, new Vector2(350f, 40f), Color.white);
        txtPrompt.rectTransform.anchorMin = txtPrompt.rectTransform.anchorMax = txtPrompt.rectTransform.pivot = new Vector2(0.5f, 0.5f);
        txtPrompt.rectTransform.anchoredPosition = Vector2.zero;
        painelPrompt.SetActive(false);

        RectTransform notifBox = CriarPainel(canvasObj.transform, "Painel_Notif", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -24f), new Vector2(560f, 42f), new Color(0.05f, 0.06f, 0.08f, 0.82f));
        notifBox.pivot = new Vector2(0.5f, 1f);
        txtNotificacao = CriarTexto(notifBox, "", 19, TextAnchor.MiddleCenter, Vector2.zero, new Vector2(540f, 38f), new Color(0.98f, 0.86f, 0.30f));
        txtNotificacao.rectTransform.anchorMin = txtNotificacao.rectTransform.anchorMax = txtNotificacao.rectTransform.pivot = new Vector2(0.5f, 0.5f);
        txtNotificacao.rectTransform.anchoredPosition = Vector2.zero;
        txtNotificacao.gameObject.SetActive(false);

        // 5) CANTO SUPERIOR ESQUERDO: Legenda de Controles [H]
        RectTransform ajudaBox = CriarPainel(canvasObj.transform, "Painel_Ajuda", new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(24f, -24f), new Vector2(310f, 178f), new Color(0.06f, 0.07f, 0.09f, 0.68f));
        painelAjuda = ajudaBox.gameObject;
        CriarTexto(ajudaBox,
            "CONTROLES ([H] Ocultar)\n" +
            "WASD: Andar / Dirigir\n" +
            "Shift: Correr / Pedalar forte\n" +
            "Espaço: Pular / Frear\n" +
            "C: Agachar  |  F / E: Roubar ou Sair\n" +
            "Q / Clique: Soco  |  V: Acenar",
            15, TextAnchor.UpperLeft, new Vector2(14f, -10f), new Vector2(286f, 160f), new Color(0.92f, 0.94f, 0.96f));
    }

    private RectTransform CriarPainel(Transform pai, string nome, Vector2 anchorMin, Vector2 anchorMax, Vector2 pos, Vector2 tam, Color cor)
    {
        GameObject go = new GameObject(nome);
        go.transform.SetParent(pai, false);
        Image img = go.AddComponent<Image>();
        img.color = cor;
        RectTransform rt = img.rectTransform;
        rt.anchorMin = anchorMin;
        rt.anchorMax = anchorMax;
        rt.pivot = anchorMax;
        rt.anchoredPosition = pos;
        rt.sizeDelta = tam;
        return rt;
    }

    private Text CriarTexto(Transform pai, string conteudo, int tamFonte, TextAnchor alinhamento, Vector2 pos, Vector2 tam, Color cor)
    {
        GameObject go = new GameObject("Txt");
        go.transform.SetParent(pai, false);
        Text t = go.AddComponent<Text>();
        if (fonteUI != null) t.font = fonteUI;
        t.text = conteudo;
        t.fontSize = tamFonte;
        t.alignment = alinhamento;
        t.color = cor;
        t.fontStyle = FontStyle.Bold;
        Shadow sh = go.AddComponent<Shadow>();
        sh.effectColor = new Color(0f, 0f, 0f, 0.8f);
        sh.effectDistance = new Vector2(1.5f, -1.5f);

        RectTransform rt = t.rectTransform;
        bool dir = alinhamento == TextAnchor.UpperRight || alinhamento == TextAnchor.LowerRight;
        rt.anchorMin = rt.anchorMax = rt.pivot = new Vector2(dir ? 1f : 0f, 1f);
        rt.anchoredPosition = pos;
        rt.sizeDelta = tam;
        return t;
    }

    private Image CriarBarra(Transform pai, Vector2 pos, Vector2 tam, Color cor)
    {
        GameObject bg = new GameObject("Barra_Fundo");
        bg.transform.SetParent(pai, false);
        Image imgBg = bg.AddComponent<Image>();
        imgBg.color = new Color(0.18f, 0.20f, 0.22f, 0.95f);
        RectTransform rtBg = imgBg.rectTransform;
        rtBg.anchorMin = rtBg.anchorMax = rtBg.pivot = new Vector2(0f, 0f);
        rtBg.anchoredPosition = pos;
        rtBg.sizeDelta = tam;

        GameObject fill = new GameObject("Barra_Fill");
        fill.transform.SetParent(bg.transform, false);
        Image imgFill = fill.AddComponent<Image>();
        imgFill.color = cor;
        imgFill.type = Image.Type.Filled;
        imgFill.fillMethod = Image.FillMethod.Horizontal;
        imgFill.fillAmount = 1f;
        RectTransform rtFill = imgFill.rectTransform;
        rtFill.anchorMin = Vector2.zero;
        rtFill.anchorMax = Vector2.one;
        rtFill.offsetMin = Vector2.zero;
        rtFill.offsetMax = Vector2.zero;
        return imgFill;
    }

    private static bool LerTeclaH()
    {
#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null && Keyboard.current.hKey.wasPressedThisFrame) return true;
#endif
#if ENABLE_LEGACY_INPUT_MANAGER
        if (Input.GetKeyDown(KeyCode.H)) return true;
#endif
        return false;
    }
}