"""Fluxo Familiar — RBAC do Círculo de Cuidado.

O Amparai existe para DIVIDIR o cuidado: quem está de plantão precisa poder REGISTRAR
o que fez (marcar remédio, confirmar plantão, lançar evento). Só a GOVERNANÇA (editar o
prontuário, convidar/remover membros, definir a escala-base) é do coordenador.

Estes testes provam exatamente essa fronteira:
  - Familiar entra no círculo por convite e enxerga o household.
  - Familiar PODE registrar cuidado (operacional).
  - Familiar NÃO PODE gerir a estrutura (governança) → 403.

Rodam só no ambiente de teste local (emulador, AMPARAI_TEST_MODE=1). Contra produção são
pulados de propósito: não existe token de Familiar em prod. Ver GUIA_STAGING.md.
"""
import requests
import pytest

from conftest import BASE_URL, TEST_BEARER, FAM_BEARER, requires_test_mode

# Pula o módulo inteiro fora do ambiente de teste local.
pytestmark = requires_test_mode


@pytest.fixture(scope="module")
def joined():
    coord = requests.Session()
    coord.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {TEST_BEARER}"})
    fam = requests.Session()
    fam.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {FAM_BEARER}"})

    # Pré-limpeza: garante que o Familiar não ficou preso a um círculo de uma execução anterior.
    fam.delete(f"{BASE_URL}/api/account")

    # Coordenadora cria um convite novo.
    r = coord.post(f"{BASE_URL}/api/invitations",
                   json={"name": "Camila", "role": "familiar", "can_see_financeiro": False})
    assert r.status_code in (200, 201), f"criar convite: {r.status_code} {r.text}"
    code = r.json()["code"]

    # Familiar aceita.
    r = fam.post(f"{BASE_URL}/api/invitations/{code}/accept")
    assert r.status_code in (200, 201), f"aceitar convite: {r.status_code} {r.text}"
    assert r.json().get("ok") is True

    yield {"coord": coord, "fam": fam, "code": code}

    # Teardown: o Familiar sai do círculo (não apaga o dado da família).
    fam.delete(f"{BASE_URL}/api/account")


class TestFamiliarEntra:
    def test_convite_aceito_liga_o_acesso(self, joined):
        """Aceitar o convite não pode ser reaproveitado (uso único)."""
        fam = joined["fam"]
        r = fam.post(f"{BASE_URL}/api/invitations/{joined['code']}/accept")
        assert r.status_code == 409  # já aceito

    def test_familiar_enxerga_o_household(self, joined):
        fam = joined["fam"]
        r = fam.get(f"{BASE_URL}/api/hoje")
        assert r.status_code == 200
        d = r.json()
        # Vê a pessoa cuidada do household da coordenadora (dado semeado), não um app vazio.
        assert d["elder"]["name"] == "Dona Maria"


class TestFamiliarRegistraCuidado:
    """Operacional — o Familiar PODE registrar o que fez no plantão/visita."""

    def test_familiar_pode_marcar_remedio(self, joined):
        fam = joined["fam"]
        meds = fam.get(f"{BASE_URL}/api/hoje").json()["medications"]["items"]
        assert meds, "esperava remédios semeados no household"
        mid = meds[0]["id"]
        original = meds[0]["taken"]

        r1 = fam.post(f"{BASE_URL}/api/medications/{mid}/toggle")
        assert r1.status_code == 200
        assert r1.json()["taken"] == (not original)

        # Restaura o estado para não interferir na suíte da coordenadora.
        r2 = fam.post(f"{BASE_URL}/api/medications/{mid}/toggle")
        assert r2.status_code == 200
        assert r2.json()["taken"] == original

    def test_familiar_pode_lancar_evento_de_saude(self, joined):
        fam = joined["fam"]
        r = fam.post(f"{BASE_URL}/api/health_events",
                     json={"title": "Visita de teste", "detail": "tudo tranquilo", "kind": "registro"})
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"

    def test_financeiro_fechado_por_padrao(self, joined):
        r = joined["fam"].get(f"{BASE_URL}/api/custos")
        assert r.status_code == 403


class TestFamiliarNaoGovernanca:
    """Governança — o Familiar NÃO edita a estrutura clínica nem convida/remove gente."""

    def test_familiar_nao_edita_prontuario(self, joined):
        fam = joined["fam"]
        r = fam.put(f"{BASE_URL}/api/clinico", json={"blood_type": "A+"})
        assert r.status_code == 403

    def test_familiar_nao_convida(self, joined):
        fam = joined["fam"]
        r = fam.post(f"{BASE_URL}/api/invitations", json={"name": "Estranho", "role": "familiar"})
        assert r.status_code == 403

    def test_familiar_nao_edita_elder(self, joined):
        fam = joined["fam"]
        r = fam.put(f"{BASE_URL}/api/elder", json={"name": "Nome Trocado"})
        assert r.status_code == 403
