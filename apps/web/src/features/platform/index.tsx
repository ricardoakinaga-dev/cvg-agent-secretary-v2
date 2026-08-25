import { useEffect, useState } from 'react'
import {
  apiClient,
  isApiConflict,
  type OperatorIdentity,
  type PlatformAgentView,
  type PlatformPluginCatalogView,
  type PlatformPluginCatalogStatus,
  type PlatformPluginManifestView,
  type PlatformTestSuiteRunView,
  type PlatformTestSuiteView,
  type PlatformTraceView,
  type PlatformVersionView
} from '../../api/client.ts'

interface PlatformPanelProps {
  identity: OperatorIdentity & { tenantId: string }
}

interface DraftForm {
  slug: string
  name: string
  description: string
  personaName: string
  personaRole: string
  tone: string
  greeting: string
  provider: string
  model: string
  minConfidence: string
  handoffDestination: string
  knowledgeSource: string
  knowledgeVersion: string
  pluginName: string
  pluginVersion: string
  pluginTools: string
  pluginEnabled: boolean
  schedulingEnabled: boolean
}

const initialForm: DraftForm = {
  slug: '',
  name: '',
  description: '',
  personaName: '',
  personaRole: 'assistant',
  tone: 'calm',
  greeting: '',
  provider: 'fake',
  model: 'deterministic-v1',
  minConfidence: '0.7',
  handoffDestination: 'controlled-reception',
  knowledgeSource: '',
  knowledgeVersion: 'controlled-v1',
  pluginName: '',
  pluginVersion: '',
  pluginTools: '',
  pluginEnabled: false,
  schedulingEnabled: false
}

export function PlatformPanel({ identity }: PlatformPanelProps) {
  const [agents, setAgents] = useState<PlatformAgentView[]>([])
  const [form, setForm] = useState<DraftForm>(initialForm)
  const [selectedAgent, setSelectedAgent] = useState<PlatformAgentView | null>(
    null
  )
  const [versions, setVersions] = useState<PlatformVersionView[]>([])
  const [version, setVersion] = useState<PlatformVersionView | null>(null)
  const [testMessage, setTestMessage] = useState('')
  const [trace, setTrace] = useState<PlatformTraceView | null>(null)
  const [traceHistory, setTraceHistory] = useState<PlatformTraceView[]>([])
  const [testSuites, setTestSuites] = useState<PlatformTestSuiteView[]>([])
  const [selectedSuite, setSelectedSuite] =
    useState<PlatformTestSuiteView | null>(null)
  const [suiteRun, setSuiteRun] = useState<PlatformTestSuiteRunView | null>(
    null
  )
  const [pluginCatalog, setPluginCatalog] = useState<
    PlatformPluginCatalogView[]
  >([])
  const [pluginCatalogLoaded, setPluginCatalogLoaded] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    apiClient
      .listPlatformAgents(identity)
      .then((items) => {
        if (!active) return
        setAgents(items)
        setSelectedAgent(items[0] ?? null)
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar os agentes.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [identity.operatorId, identity.role, identity.tenantId])

  useEffect(() => {
    let active = true
    Promise.all([
      apiClient.listPlatformTestRuns(identity, 10),
      apiClient.listPlatformExecutionTraces(identity, 10)
    ])
      .then(([testRuns, executionTraces]) => {
        if (!active) return
        setTraceHistory([...executionTraces, ...testRuns])
      })
      .catch(() => {
        if (active) setTraceHistory([])
      })
    return () => {
      active = false
    }
  }, [identity.operatorId, identity.role, identity.tenantId])

  useEffect(() => {
    if (!selectedAgent) {
      setVersions([])
      setVersion(null)
      return
    }
    let active = true
    setVersion(null)
    apiClient
      .listPlatformVersions(identity, selectedAgent.id)
      .then((items) => {
        if (!active) return
        setVersions(items)
        const latest = items[0] ?? null
        setVersion(latest)
        if (latest) setForm(formFromVersion(selectedAgent, latest.config))
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar as versões.')
      })
    return () => {
      active = false
    }
  }, [identity.operatorId, identity.role, identity.tenantId, selectedAgent?.id])

  const updateForm = (key: keyof DraftForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const createDraft = async () => {
    setIsSaving(true)
    setError(null)
    setStatusMessage(null)
    try {
      if (selectedAgent && version) {
        const createdVersion = await apiClient.clonePlatformVersion({
          identity,
          agentId: selectedAgent.id,
          versionId: version.id,
          config: buildConfig(form, version.config)
        })
        const refreshed = await apiClient.listPlatformVersions(
          identity,
          selectedAgent.id
        )
        setVersions(refreshed)
        setVersion(createdVersion)
        setForm(formFromVersion(selectedAgent, createdVersion.config))
        setStatusMessage(`Nova versão v${createdVersion.version} criada.`)
        return
      }
      const agent = await apiClient.createPlatformAgent({
        identity,
        slug: form.slug,
        name: form.name,
        description: form.description
      })
      const createdVersion = await apiClient.createPlatformVersion({
        identity,
        agentId: agent.id,
        config: buildConfig(form)
      })
      setAgents((current) => [...current, agent])
      setSelectedAgent(agent)
      setVersions([createdVersion])
      setVersion(createdVersion)
      setForm(formFromVersion(agent, createdVersion.config))
      setStatusMessage(`Rascunho v${createdVersion.version ?? 1} criado.`)
    } catch {
      setError('Não foi possível criar o rascunho.')
    } finally {
      setIsSaving(false)
    }
  }

  const transition = async (target: 'TESTING' | 'APPROVED') => {
    if (!selectedAgent || !version) return
    setIsSaving(true)
    setError(null)
    try {
      const updated = await apiClient.transitionPlatformVersion({
        identity,
        agentId: selectedAgent.id,
        versionId: version.id,
        target,
        expectedStatus: version.status
      })
      setVersion(updated)
      setVersions((current) =>
        current.map((candidate) =>
          candidate.id === updated.id ? updated : candidate
        )
      )
      setStatusMessage(`Versão movida para ${updated.status}.`)
    } catch (error) {
      setError(
        isApiConflict(error)
          ? 'A versão mudou em outro operador. Recarregue o agente antes de tentar novamente.'
          : 'Transição de versão recusada pela policy.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const publish = async () => {
    if (!selectedAgent || !version) return
    setIsSaving(true)
    setError(null)
    try {
      const published = await apiClient.publishPlatformVersion({
        identity,
        agentId: selectedAgent.id,
        versionId: version.id,
        expectedStatus: version.status
      })
      setVersion(published)
      setVersions((current) =>
        current.map((candidate) =>
          candidate.id === published.id ? published : candidate
        )
      )
      setStatusMessage('Versão publicada como snapshot imutável.')
    } catch (error) {
      setError(
        isApiConflict(error)
          ? 'A versão mudou em outro operador. Recarregue o agente antes de publicar.'
          : 'Somente uma versão aprovada pode ser publicada.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const rollbackTarget = version
    ? versions.find(
        (candidate) =>
          candidate.id !== version.id &&
          candidate.status !== 'DRAFT' &&
          candidate.status !== 'TESTING'
      )
    : null

  const rollback = async () => {
    if (!selectedAgent || !rollbackTarget) return
    setIsSaving(true)
    setError(null)
    try {
      const rolledBack = await apiClient.rollbackPlatformVersion({
        identity,
        agentId: selectedAgent.id,
        versionId: rollbackTarget.id,
        expectedStatus: rollbackTarget.status
      })
      const refreshed = await apiClient.listPlatformVersions(
        identity,
        selectedAgent.id
      )
      setVersions(refreshed)
      setVersion(rolledBack)
      setStatusMessage(
        `Rollback criou e publicou a versão v${rolledBack.version}.`
      )
    } catch (error) {
      setError(
        isApiConflict(error)
          ? 'O alvo do rollback mudou em outro operador. Recarregue o agente.'
          : 'O rollback foi recusado pela policy de versões.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const runTest = async () => {
    if (!selectedAgent || !version || !testMessage.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const result = await apiClient.runPlatformTestLab({
        identity,
        agentId: selectedAgent.id,
        versionId: version.id,
        message: testMessage,
        ...(form.knowledgeSource
          ? {
              approvedKnowledge: {
                version: form.knowledgeVersion.trim() || 'controlled-v1',
                answer: 'Resposta institucional fictícia.',
                source: form.knowledgeSource
              }
            }
          : {})
      })
      setTrace(result)
      setTraceHistory((current) => [
        result,
        ...current.filter((item) => item.traceId !== result.traceId)
      ])
      setStatusMessage('Dry-run concluído sem chamada externa.')
    } catch {
      setError('O Test Lab recusou esta entrada.')
    } finally {
      setIsSaving(false)
    }
  }

  const loadTestSuites = async () => {
    setError(null)
    try {
      const suites = await apiClient.listPlatformTestSuites(
        identity,
        selectedAgent?.id
      )
      setTestSuites(suites)
      setSelectedSuite(suites[0] ?? null)
      setSuiteRun(null)
    } catch {
      setError('Não foi possível carregar as suites do Test Lab.')
    }
  }

  const createTestSuite = async () => {
    if (!selectedAgent || !version) return
    setIsSaving(true)
    setError(null)
    try {
      const suite = await apiClient.createPlatformTestSuite({
        identity,
        slug: `${selectedAgent.slug}-smoke-suite`,
        name: `${selectedAgent.name} Smoke Suite`,
        description: 'Suite fictícia controlada.',
        agentId: selectedAgent.id,
        versionId: version.id,
        cases: [
          {
            id: 'safe-greeting',
            message: 'Olá',
            history: [],
            expectedResponseMode: 'clarify',
            expectedHandoff: false
          }
        ]
      })
      setTestSuites((current) => [suite, ...current])
      setSelectedSuite(suite)
      setStatusMessage('Suite controlada criada como snapshot imutável.')
    } catch {
      setError('Não foi possível criar a suite controlada.')
    } finally {
      setIsSaving(false)
    }
  }

  const evaluateSelectedSuite = async () => {
    if (!selectedSuite || !version) return
    setIsSaving(true)
    setError(null)
    try {
      const run = await apiClient.evaluatePlatformTestSuite({
        identity,
        suiteId: selectedSuite.id,
        versionId: version.id
      })
      setSuiteRun(run)
      setStatusMessage('Suite avaliada em dry-run sem chamada externa.')
    } catch {
      setError('A avaliação da suite foi recusada pelo Test Lab.')
    } finally {
      setIsSaving(false)
    }
  }

  const compareSelectedSuite = async () => {
    if (!selectedSuite || !version) return
    setIsSaving(true)
    setError(null)
    try {
      const run = await apiClient.comparePlatformTestSuite({
        identity,
        suiteId: selectedSuite.id,
        versionAId: selectedSuite.versionId,
        versionBId: version.id
      })
      setSuiteRun(run)
      setStatusMessage('Comparação A/B concluída somente no Test Lab.')
    } catch {
      setError('A comparação A/B foi recusada por escopo de versão.')
    } finally {
      setIsSaving(false)
    }
  }

  const loadPluginCatalog = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const entries = await apiClient.listPlatformPluginCatalog(identity)
      setPluginCatalog(entries)
      setPluginCatalogLoaded(true)
    } catch {
      setError('Não foi possível carregar o catálogo de plugins.')
    } finally {
      setIsSaving(false)
    }
  }

  const createPluginCatalogEntry = async () => {
    const manifest = buildPluginCatalogManifest(form)
    if ('error' in manifest) {
      setError(manifest.error)
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const entry = await apiClient.createPlatformPluginCatalog({
        identity,
        manifest: manifest.value
      })
      setPluginCatalog((current) => [entry, ...current])
      setPluginCatalogLoaded(true)
      setStatusMessage('Metadata do plugin criada como DRAFT.')
    } catch {
      setError('Não foi possível criar a metadata do plugin.')
    } finally {
      setIsSaving(false)
    }
  }

  const transitionPluginCatalogEntry = async (
    entry: PlatformPluginCatalogView,
    target: PlatformPluginCatalogStatus
  ) => {
    setIsSaving(true)
    setError(null)
    try {
      const updated = await apiClient.transitionPlatformPluginCatalog({
        identity,
        pluginId: entry.id,
        target,
        expectedStatus: entry.status
      })
      setPluginCatalog((current) =>
        current.map((candidate) =>
          candidate.id === updated.id ? updated : candidate
        )
      )
      setStatusMessage(
        target === 'APPROVED'
          ? 'Metadata do plugin aprovada; execução continua bloqueada.'
          : 'Metadata do plugin arquivada; execução continua bloqueada.'
      )
    } catch (error) {
      setError(
        isApiConflict(error)
          ? 'O metadata do plugin mudou em outro operador. Recarregue o catálogo antes de tentar novamente.'
          : 'A transição da metadata do plugin foi recusada.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="panel platformPanel" aria-label="Control Center">
      <div className="panelHeader">
        <div>
          <h2>Control Center</h2>
          <p>Agentes, versões e Test Lab — tenant controlado.</p>
        </div>
        <span className="status">{identity.tenantId}</span>
      </div>
      <div className="platformBody">
        <div className="platformAgents">
          <h3>Agentes</h3>
          {isLoading ? <p>Carregando...</p> : null}
          {!isLoading && agents.length === 0 ? (
            <p>Nenhum agente configurado.</p>
          ) : null}
          {agents.map((agent) => (
            <button
              className="row rowButton"
              key={agent.id}
              type="button"
              onClick={() => {
                setSelectedAgent(agent)
                setTrace(null)
              }}
            >
              <strong>{agent.name}</strong>
              <span>{agent.slug}</span>
            </button>
          ))}
        </div>
        <div className="platformEditor">
          <h3>Novo agente / configuração</h3>
          <div className="platformFields">
            <label>
              Slug do agente
              <input
                value={form.slug}
                readOnly={Boolean(selectedAgent)}
                onChange={(event) => updateForm('slug', event.target.value)}
              />
            </label>
            <label>
              Nome do agente
              <input
                value={form.name}
                readOnly={Boolean(selectedAgent)}
                onChange={(event) => updateForm('name', event.target.value)}
              />
            </label>
            <label>
              Descrição
              <input
                value={form.description}
                readOnly={Boolean(selectedAgent)}
                onChange={(event) =>
                  updateForm('description', event.target.value)
                }
              />
            </label>
            <label>
              Nome da persona
              <input
                value={form.personaName}
                onChange={(event) =>
                  updateForm('personaName', event.target.value)
                }
              />
            </label>
            <label>
              Papel da persona
              <input
                value={form.personaRole}
                onChange={(event) =>
                  updateForm('personaRole', event.target.value)
                }
              />
            </label>
            <label>
              Tom da persona
              <input
                value={form.tone}
                onChange={(event) => updateForm('tone', event.target.value)}
              />
            </label>
            <label>
              Saudação
              <input
                value={form.greeting}
                onChange={(event) => updateForm('greeting', event.target.value)}
              />
            </label>
            <label>
              Provider lógico
              <input
                value={form.provider}
                onChange={(event) => updateForm('provider', event.target.value)}
              />
            </label>
            <label>
              Modelo lógico
              <input
                value={form.model}
                onChange={(event) => updateForm('model', event.target.value)}
              />
            </label>
            <label>
              Threshold de confiança
              <input
                inputMode="decimal"
                value={form.minConfidence}
                onChange={(event) =>
                  updateForm('minConfidence', event.target.value)
                }
              />
            </label>
            <label>
              Destino de handoff
              <input
                value={form.handoffDestination}
                onChange={(event) =>
                  updateForm('handoffDestination', event.target.value)
                }
              />
            </label>
            <label>
              Fonte de knowledge controlada
              <input
                value={form.knowledgeSource}
                onChange={(event) =>
                  updateForm('knowledgeSource', event.target.value)
                }
                placeholder="controlled://source"
              />
            </label>
            <label>
              Versão da knowledge aprovada
              <input
                value={form.knowledgeVersion}
                onChange={(event) =>
                  updateForm('knowledgeVersion', event.target.value)
                }
                placeholder="controlled-v1"
              />
            </label>
            <label>
              Plugin lógico
              <input
                value={form.pluginName}
                onChange={(event) =>
                  updateForm('pluginName', event.target.value)
                }
                placeholder="fake.echo"
              />
            </label>
            <label>
              Versão pinned do plugin (opcional)
              <input
                value={form.pluginVersion}
                onChange={(event) =>
                  updateForm('pluginVersion', event.target.value)
                }
                placeholder="1.0.0"
              />
            </label>
            <label>
              Tools do plugin
              <input
                value={form.pluginTools}
                onChange={(event) =>
                  updateForm('pluginTools', event.target.value)
                }
                placeholder="echo,find_slots"
              />
            </label>
            <label>
              <input
                type="checkbox"
                aria-label="Plugin lógico habilitado"
                checked={form.pluginEnabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pluginEnabled: event.target.checked
                  }))
                }
              />
              Plugin lógico habilitado
            </label>
            <label>
              <input
                type="checkbox"
                aria-label="Scheduling controlado"
                checked={form.schedulingEnabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    schedulingEnabled: event.target.checked
                  }))
                }
              />
              Scheduling controlado
            </label>
          </div>
          <div className="actions">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void createDraft()}
            >
              {selectedAgent && version
                ? 'Salvar nova versão'
                : 'Criar rascunho'}
            </button>
            {version?.status === 'DRAFT' ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void transition('TESTING')}
              >
                Enviar para teste
              </button>
            ) : null}
            {version?.status === 'TESTING' ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void transition('APPROVED')}
              >
                Aprovar versão
              </button>
            ) : null}
            {version?.status === 'APPROVED' ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void publish()}
              >
                Publicar versão
              </button>
            ) : null}
            {version?.status === 'PUBLISHED' && rollbackTarget ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void rollback()}
              >
                Rollback para v{rollbackTarget.version}
              </button>
            ) : null}
          </div>
          {version ? (
            <p>
              Versão {version.version} — {version.status}
            </p>
          ) : null}
          <label>
            Mensagem fictícia para Test Lab
            <input
              value={testMessage}
              onChange={(event) => setTestMessage(event.target.value)}
              placeholder="Qual o horário de funcionamento?"
            />
          </label>
          <button
            type="button"
            disabled={isSaving || !version}
            onClick={() => void runTest()}
          >
            Executar dry-run
          </button>
          <section
            className="platformSuiteCatalog"
            aria-label="Catálogo de suites do Test Lab"
          >
            <div className="panelHeader">
              <div>
                <h3>Suites / regressão controlada</h3>
                <p>
                  Snapshots tenant-aware; avaliações A/B nunca publicam nem
                  despacham.
                </p>
              </div>
              <span className="status">{testSuites.length}</span>
            </div>
            <div className="actions">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void loadTestSuites()}
              >
                Carregar suites
              </button>
              <button
                type="button"
                disabled={isSaving || !selectedAgent || !version}
                onClick={() => void createTestSuite()}
              >
                Criar suite do agente
              </button>
              {selectedSuite ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving || !version}
                    onClick={() => void evaluateSelectedSuite()}
                  >
                    Avaliar suite
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !version}
                    onClick={() => void compareSelectedSuite()}
                  >
                    Comparar A/B
                  </button>
                </>
              ) : null}
            </div>
            {testSuites.map((suite) => (
              <button
                className="row rowButton"
                key={suite.id}
                type="button"
                onClick={() => {
                  setSelectedSuite(suite)
                  setSuiteRun(null)
                }}
              >
                <strong>
                  {suite.name} v{suite.version}
                </strong>
                <span>
                  {suite.cases.length} caso(s) · {suite.versionId}
                </span>
              </button>
            ))}
            {suiteRun ? (
              <div
                className="platformTrace"
                aria-label="Resultado da suite do Test Lab"
              >
                <strong>{suiteRun.passed ? 'PASS' : 'FAIL'}</strong>
                {suiteRun.variants.map((variant) => (
                  <span key={variant.label}>
                    Variante {variant.label}:{' '}
                    {variant.passed ? 'passou' : 'falhou'} · {variant.versionId}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
          <section
            className="platformPluginCatalog"
            aria-label="Catálogo declarativo de plugins"
          >
            <div className="panelHeader">
              <div>
                <h3>Plugins / catálogo declarativo</h3>
                <p>
                  Manifests tenant-aware para revisão; este catálogo não instala
                  código nem libera execução.
                </p>
              </div>
              <span className="status">{pluginCatalog.length}</span>
            </div>
            <div className="actions">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void loadPluginCatalog()}
              >
                Carregar catálogo de plugins
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void createPluginCatalogEntry()}
              >
                Criar metadata do plugin
              </button>
            </div>
            <p>APPROVED: metadata revisada; execução continua bloqueada.</p>
            {pluginCatalogLoaded && pluginCatalog.length === 0 ? (
              <p>Nenhum plugin catalogado.</p>
            ) : null}
            {pluginCatalog.map((entry) => (
              <div className="row" key={entry.id}>
                <strong>
                  {entry.manifest.name}@{entry.manifest.version}
                </strong>
                <span>Status: {entry.status}</span>
                <span>Criado por: {entry.createdBy}</span>
                <span>
                  Aprovado por: {entry.approvedBy ?? 'ainda não aprovado'}
                </span>
                <div className="actions">
                  {entry.status === 'DRAFT' ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() =>
                        void transitionPluginCatalogEntry(entry, 'APPROVED')
                      }
                    >
                      Aprovar metadata do plugin
                    </button>
                  ) : null}
                  {entry.status !== 'ARCHIVED' ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() =>
                        void transitionPluginCatalogEntry(entry, 'ARCHIVED')
                      }
                    >
                      Arquivar metadata do plugin
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
          {trace ? (
            <div className="platformTrace" aria-label="Resultado do Test Lab">
              <strong>{trace.response.mode}</strong>
              <span>intent: {trace.intent.name}</span>
              <span>
                risk: {trace.risk?.level ?? 'unknown'}
                {trace.risk?.reason ? ` (${trace.risk.reason})` : ''}
              </span>
              <span>policy: {trace.policy[0]?.decision ?? 'unknown'}</span>
              <span>policy reason: {trace.policy[0]?.reason ?? 'unknown'}</span>
              <span>knowledge: {trace.knowledge.status}</span>
              <span>configVersion: {trace.configVersion}</span>
              <span>
                prompt: {trace.prompt?.version ?? trace.configVersion}
              </span>
              <span>status: {trace.status ?? 'completed'}</span>
              <span>
                latency: {trace.latencyMs ?? 0}ms · tokens:{' '}
                {trace.tokenUsage?.total ?? 'unknown'}
              </span>
              <span>
                handoff: {trace.handoff.requested ? trace.handoff.reason : 'no'}
              </span>
              <span>response: {trace.response.text}</span>
              <span>
                provider: {trace.provider.provider}/{trace.provider.model}
              </span>
              <span>externalCall: {String(trace.provider.externalCall)}</span>
              <span>
                spans:{' '}
                {trace.spans?.map((span) => span.name).join(' → ') ??
                  'legacy trace'}
              </span>
            </div>
          ) : null}
          <section className="platformTraceViewer" aria-label="Trace Viewer">
            <div className="panelHeader">
              <div>
                <h3>Trace Viewer</h3>
                <p>Execuções persistidas, redigidas e tenant-scoped.</p>
              </div>
              <span className="status">{traceHistory.length}</span>
            </div>
            {traceHistory.length === 0 ? (
              <p>Nenhuma trace persistida.</p>
            ) : (
              <div className="platformTraceList">
                {traceHistory.map((item) => (
                  <button
                    className="row rowButton"
                    key={item.traceId}
                    type="button"
                    onClick={() => setTrace(item)}
                  >
                    <strong>{item.executionMode}</strong>
                    <span>{item.traceId}</span>
                    <span>{item.configVersion}</span>
                    <span>
                      {item.tools.length > 0
                        ? item.tools
                            .map((tool) => `${tool.name}: ${tool.status}`)
                            .join(', ')
                        : 'sem tools'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
          {statusMessage ? <p>{statusMessage}</p> : null}
          {error ? <p className="stateError">{error}</p> : null}
        </div>
      </div>
    </section>
  )
}

function formFromVersion(
  agent: PlatformAgentView,
  rawConfig: Record<string, unknown>
): DraftForm {
  const persona = asRecord(rawConfig.persona)
  const model = asRecord(rawConfig.model)
  const policies = asRecord(rawConfig.policies)
  const handoff = asRecord(rawConfig.handoff)
  const knowledge = Array.isArray(rawConfig.knowledge)
    ? rawConfig.knowledge
        .map(asRecord)
        .find((item) => typeof item.source === 'string')
    : undefined
  const plugins = Array.isArray(rawConfig.plugins)
    ? rawConfig.plugins.map(asRecord)
    : []
  const scheduling = plugins.find(
    (plugin) => plugin.plugin === 'scheduling.controlled'
  )
  const customPlugin = plugins.find(
    (plugin) => plugin.plugin !== 'scheduling.controlled'
  )
  const customTools = Array.isArray(customPlugin?.allowedTools)
    ? customPlugin.allowedTools.filter(
        (tool): tool is string => typeof tool === 'string'
      )
    : []
  const destinations = Array.isArray(handoff.destinations)
    ? handoff.destinations.filter(
        (destination): destination is string => typeof destination === 'string'
      )
    : []
  return {
    slug: agent.slug,
    name: agent.name,
    description: agent.description,
    personaName: readString(persona.name, agent.name),
    personaRole: readString(persona.role, 'assistant'),
    tone: readString(persona.tone, 'calm'),
    greeting: readString(rawConfig.greeting, 'Como posso ajudar?'),
    provider: readString(model.provider, 'fake'),
    model: readString(model.model, 'deterministic-v1'),
    minConfidence: String(
      typeof policies.minConfidence === 'number' ? policies.minConfidence : 0.7
    ),
    handoffDestination: readString(
      destinations[0] ?? handoff.lowConfidenceDestination,
      'controlled-reception'
    ),
    knowledgeSource: readString(knowledge?.source, ''),
    knowledgeVersion: readString(knowledge?.version, 'controlled-v1'),
    pluginName: readString(customPlugin?.plugin, ''),
    pluginVersion: readString(customPlugin?.version, ''),
    pluginTools: customTools.join(','),
    pluginEnabled: customPlugin?.enabled === true,
    schedulingEnabled: scheduling?.enabled === true
  }
}

function buildPluginCatalogManifest(
  form: DraftForm
): { value: PlatformPluginManifestView } | { error: string } {
  const name = form.pluginName.trim()
  const version = form.pluginVersion.trim() || '1.0.0'
  const tools = Array.from(
    new Set(
      form.pluginTools
        .split(',')
        .map((tool) => tool.trim())
        .filter(Boolean)
    )
  )
  const identifierPattern = /^[A-Za-z0-9._:-]+$/
  if (!name || name.length > 120 || !identifierPattern.test(name)) {
    return {
      error:
        'Informe um nome de plugin válido para a metadata (somente letras, números, ponto, sublinhado, dois-pontos ou hífen).'
    }
  }
  if (version.length > 80) {
    return { error: 'A versão da metadata do plugin é muito longa.' }
  }
  if (
    tools.some((tool) => tool.length > 120 || !identifierPattern.test(tool))
  ) {
    return {
      error:
        'Cada tool do catálogo deve usar somente letras, números, ponto, sublinhado, dois-pontos ou hífen.'
    }
  }
  const permissions = tools.map((tool) => `plugin:${name}:${tool}`)
  return {
    value: {
      name,
      version,
      capabilities: tools.map((tool) => `controlled:${name}:${tool}`),
      permissions,
      tools: tools.map((tool) => {
        const permission = `plugin:${name}:${tool}`
        return {
          name: tool,
          permission,
          risk: 'low',
          requiresApproval: false
        }
      }),
      hooks: [],
      dependencies: [],
      configSchemaVersion: '1'
    }
  }
}

function buildConfig(
  form: DraftForm,
  rawBaseConfig?: Record<string, unknown>
): Record<string, unknown> {
  const base = rawBaseConfig ? structuredClone(rawBaseConfig) : {}
  const pluginName = form.pluginName.trim()
  const pluginVersion = form.pluginVersion.trim()
  const pluginTools = form.pluginTools
    .split(',')
    .map((tool) => tool.trim())
    .filter(Boolean)
  const source = form.knowledgeSource.trim()
  const minConfidence = Number(form.minConfidence)
  const basePolicies = asRecord(base.policies)
  const baseEnabledActions = readStringArray(basePolicies.enabledActions)
  const enabledActions = (
    baseEnabledActions.length
      ? baseEnabledActions
      : ['respond', 'institutional_question']
  ).filter((action) => action !== 'scheduling')
  if (form.schedulingEnabled) enabledActions.push('scheduling')
  return {
    ...base,
    persona: {
      ...asRecord(base.persona),
      name: form.personaName.trim() || form.name.trim(),
      role: form.personaRole.trim() || 'assistant',
      tone: form.tone.trim() || 'calm'
    },
    greeting: form.greeting.trim() || 'Como posso ajudar?',
    promptBlocks: Array.isArray(base.promptBlocks)
      ? base.promptBlocks
      : [
          {
            id: 'persona',
            kind: 'persona',
            content: `${form.personaName.trim() || form.name.trim()} — ${form.tone.trim() || 'calm'}`,
            priority: 10,
            enabled: true
          }
        ],
    responseTemplates: Object.keys(asRecord(base.responseTemplates)).length
      ? asRecord(base.responseTemplates)
      : { unknown: 'Vou encaminhar sua solicitação.' },
    model: {
      ...asRecord(base.model),
      provider: form.provider.trim() || 'fake',
      model: form.model.trim() || 'deterministic-v1',
      temperature: 0,
      maxTokens: 512,
      timeoutMs: 3000,
      retries: 0,
      secretRef: `secret://controlled/${form.provider.trim() || 'fake'}`
    },
    featureFlags: {
      ...asRecord(base.featureFlags),
      testLab: true,
      realChannels: false,
      realRag: false,
      realPayments: false,
      realMedicalRecords: false
    },
    policies: {
      ...basePolicies,
      version: 'policy-ui-draft-v1',
      minConfidence: Number.isFinite(minConfidence)
        ? Math.min(1, Math.max(0, minConfidence))
        : 0.7,
      lowConfidence: 'clarify',
      maxClarifications: 2,
      enabledActions: [...new Set(enabledActions)],
      approvalActions: readStringArray(basePolicies.approvalActions).length
        ? readStringArray(basePolicies.approvalActions)
        : ['create_appointment_draft'],
      blockedActions: readStringArray(basePolicies.blockedActions).length
        ? readStringArray(basePolicies.blockedActions)
        : ['confirm_appointment', 'cancel_appointment']
    },
    plugins: buildPlugins(
      form,
      base.plugins,
      pluginName,
      pluginVersion,
      pluginTools
    ),
    knowledge: source
      ? [
          {
            source,
            version: form.knowledgeVersion.trim() || 'controlled-v1',
            enabled: true,
            requiresApprovedSource: true
          }
        ]
      : [],
    handoff: {
      lowConfidenceDestination:
        form.handoffDestination.trim() || 'controlled-reception',
      destinations: [form.handoffDestination.trim() || 'controlled-reception'],
      maxClarifications: 2
    }
  }
}

function buildPlugins(
  form: DraftForm,
  rawPlugins: unknown,
  pluginName: string,
  pluginVersion: string,
  pluginTools: string[]
): Array<Record<string, unknown>> {
  const plugins = Array.isArray(rawPlugins) ? rawPlugins.map(asRecord) : []
  const scheduling = plugins.find(
    (plugin) => plugin.plugin === 'scheduling.controlled'
  )
  const withoutScheduling = plugins.filter(
    (plugin) => plugin.plugin !== 'scheduling.controlled'
  )
  const nextScheduling = scheduling
    ? {
        ...scheduling,
        enabled: form.schedulingEnabled,
        allowedTools: ['find_available_slots']
      }
    : form.schedulingEnabled
      ? {
          plugin: 'scheduling.controlled',
          enabled: true,
          allowedTools: ['find_available_slots'],
          config: {}
        }
      : null
  const existingCustom = withoutScheduling.find(
    (plugin) => plugin.plugin === pluginName
  )
  const custom = pluginName
    ? {
        ...withoutPluginVersion(existingCustom),
        plugin: pluginName,
        ...(pluginVersion ? { version: pluginVersion } : {}),
        enabled: form.pluginEnabled,
        allowedTools: pluginTools,
        config: existingCustom ? asRecord(existingCustom.config) : {}
      }
    : null
  const preservedCustom = pluginName
    ? withoutScheduling.filter((plugin) => plugin.plugin !== pluginName)
    : withoutScheduling
  return [
    ...preservedCustom,
    ...(nextScheduling ? [nextScheduling] : []),
    ...(custom ? [custom] : [])
  ]
}

function withoutPluginVersion(
  plugin: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!plugin) return {}
  return Object.fromEntries(
    Object.entries(plugin).filter(([key]) => key !== 'version')
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0
      )
    : []
}
