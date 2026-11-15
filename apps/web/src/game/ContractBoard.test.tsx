import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { OrdinaryContractDto } from '@warwrit/protocol';
import { ContractConversation } from './ContractBoard.js';
import { contractPlaceFacts } from './contract-visits.js';
import type { ContractVisit } from './contract-visits.js';

const issuerLocation = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
const herbs: OrdinaryContractDto = {
  instanceId: 'ci.m1.missing-herbs.01',
  template: 'INVESTIGATE',
  issuerRoleId: 'village-provisioner',
  issuerLocation,
  rewardQ: '40000000',
  revision: '1',
  yourRole: 'OWNER',
  helperSlot: 'AVAILABLE',
  state: 'ACTIVE',
  completedByYou: false,
  canAccept: false,
  canHelp: false,
  canWithdraw: true,
  canReturnCargo: false,
  yourCustody: [],
  yourCargo: [],
  steps: [
    {
      stepId: 'inspect-green',
      action: 'INSPECT',
      location: issuerLocation,
      doneByYou: false,
      blocker: null,
      completes: false,
    },
    {
      stepId: 'report',
      action: 'REPORT',
      location: issuerLocation,
      doneByYou: false,
      blocker: 'MISSING_EVIDENCE',
      completes: true,
    },
  ],
};

function render(
  contract: OrdinaryContractDto,
  visit: ContractVisit | null,
  currentSiteId = 'bereznyak',
) {
  return renderToStaticMarkup(
    <ContractConversation
      contract={contract}
      currentSiteId={currentSiteId}
      visit={visit}
      canVisit
      busy={false}
      onCommand={() => undefined}
      onVisitIssuer={() => undefined}
      onJournal={() => undefined}
    />,
  );
}

describe('contract conversation and journal boundaries', () => {
  it('says a no-payout ending paid nobody for both the owner and other companies', () => {
    const resolvedWithoutPayout: OrdinaryContractDto = {
      ...herbs,
      instanceId: 'ci.m1.empty-watch-record.01',
      issuerRoleId: 'city-notice-clerk',
      issuerLocation: { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' },
      state: 'COMPLETED',
      terminalPayout: 'NO_PAYOUT',
      completedByYou: false,
    };

    for (const yourRole of ['OWNER', 'NONE'] as const) {
      const markup = render(
        { ...resolvedWithoutPayout, yourRole },
        { siteId: 'kamenny-brod', building: 'market' },
        'kamenny-brod',
      );
      expect(markup).toContain('выполнен без выплаты');
      expect(markup).not.toContain('оплачен вам');
      expect(markup).not.toContain('оплачен другой компании');
    }
  });

  it('shows a local lead outside a conversation and fixed terms only at its issuer', () => {
    const offered = {
      ...herbs,
      yourRole: 'NONE' as const,
      state: 'OFFERED' as const,
      canAccept: true,
    };
    const lead = render(offered, null);
    expect(lead).toContain('Поговорить');
    expect(lead).not.toContain('Договориться и взять поручение');
    expect(render(offered, { siteId: 'bereznyak', building: 'forge' })).not.toContain(
      'Договориться и взять поручение',
    );
    const meeting = render(offered, { siteId: 'bereznyak', building: 'herbalist' });
    expect(meeting).toContain('Договориться и взять поручение');
    expect(meeting).toContain('40 кр.');
    expect(meeting).toContain('лично доложите заказчику');
  });

  it('does not invite an early hand-in, then routes an evidenced report to its issuer', () => {
    const journal = render(herbs, null);
    expect(journal).toContain('сначала предыдущие шаги');
    expect(journal).not.toContain('Встретиться');
    const ready: OrdinaryContractDto = { ...herbs, steps: [{ ...herbs.steps[1]!, blocker: null }] };
    expect(render(ready, null)).toContain('Встретиться');
    expect(render(ready, null)).not.toContain('Передать результат заказчику');
    expect(render(ready, null, 'severny-dvor')).not.toContain('Встретиться');
    expect(render(ready, { siteId: 'bereznyak', building: 'herbalist' })).toContain(
      'Передать результат заказчику',
    );
  });

  it('shows the accepted pre-battle withdrawal choice', () => {
    const html = render(herbs, null);
    expect(html).toContain('Отказаться от поручения');
  });

  it('keeps green inspection out of village mills and issuer meetings, while allowing real mill field work', () => {
    expect(render(herbs, null)).toContain('class="gear-action"');
    for (const building of ['mill', 'herbalist'] as const) {
      const inside = render(herbs, { siteId: 'bereznyak', building });
      expect(inside).not.toContain('class="gear-action"');
      expect(inside).toContain('Выйти на площадь и продолжить');
    }
    const millPlace = { siteId: 'staraya-melnitsa', areaId: 'staraya-melnitsa-yard' };
    const rescue: OrdinaryContractDto = {
      ...herbs,
      instanceId: 'ci.m1.mill-worker.01',
      template: 'RESCUE',
      steps: [
        {
          stepId: 'release',
          action: 'RELEASE',
          location: millPlace,
          doneByYou: false,
          blocker: null,
          completes: false,
        },
      ],
      yourCustody: ['person.mill-worker.01'],
    };
    expect(render(rescue, { siteId: 'staraya-melnitsa', building: 'mill' })).toContain(
      'class="gear-action"',
    );
  });

  it('shows a branch-specific result only after its source-backed observation is known', () => {
    const lightSack: OrdinaryContractDto = {
      ...herbs,
      instanceId: 'ci.m1.light-sack.01',
      issuerRoleId: 'city-granary-clerk',
      issuerLocation: { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' },
      steps: [
        {
          stepId: 'inspect-granary',
          action: 'INSPECT',
          location: { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' },
          doneByYou: false,
          blocker: 'WRONG_PLACE',
          completes: false,
        },
      ],
    };
    expect(render(lightSack, null)).not.toContain('старым ведром');
    const observed: OrdinaryContractDto = {
      ...lightSack,
      steps: [
        {
          ...lightSack.steps[0]!,
          doneByYou: true,
          blocker: 'ALREADY_DONE',
          findingTextKey: 'contract.ci.m1.light-sack.01.result.light-sack.measure-clue',
        },
      ],
    };
    expect(render(observed, null)).toContain('старым ведром с вмятиной на боку');
  });
});

it('shows place memory only for established completion known to the company', () => {
  expect(contractPlaceFacts([herbs])).toEqual([]);
  expect(contractPlaceFacts([{ ...herbs, state: 'COMPLETED', yourRole: 'NONE' }])).toEqual([]);
  expect(contractPlaceFacts([{ ...herbs, state: 'COMPLETED' }])).toEqual([
    {
      instanceId: herbs.instanceId,
      siteId: 'bereznyak',
      text: 'Агафья знает: травы унесли в сторону Северного Двора.',
    },
  ]);
});

it('shows shared empty-watch camp and watchman state only after the world choice', () => {
  const emptyWatch: OrdinaryContractDto = {
    ...herbs,
    instanceId: 'ci.m1.empty-watch-record.01',
    issuerRoleId: 'city-notice-clerk',
    issuerLocation: { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' },
    yourRole: 'NONE',
    state: 'COMPLETED',
  };
  expect(contractPlaceFacts([emptyWatch])).toEqual([]);
  expect(
    contractPlaceFacts([
      {
        ...emptyWatch,
        publicConsequences: {
          kind: 'EMPTY_WATCH_RECORD',
          refugeeCamp: 'REMOVED',
          watchman: 'IN_CUSTODY',
        },
      },
    ]),
  ).toEqual([
    {
      instanceId: 'ci.m1.empty-watch-record.01:camp',
      siteId: 'kamenny-brod',
      text: 'Через два дня под мостом остаются только чёрные круги от костров.',
    },
    {
      instanceId: 'ci.m1.empty-watch-record.01:watchman',
      siteId: 'kamenny-brod',
      text: 'Прокопа посадили под замок.',
    },
  ]);
  expect(
    contractPlaceFacts([
      {
        ...emptyWatch,
        publicConsequences: {
          kind: 'EMPTY_WATCH_RECORD',
          refugeeCamp: 'PRESENT',
          watchman: 'ON_DUTY',
        },
      },
    ]).map((fact) => fact.text),
  ).toEqual([
    'Под мостом шалаши. В них живут семь семей с того берега, из Полесского герцогства.',
    'Прокоп остаётся на службе.',
  ]);
});

it('shows returned sack custody and the saved grain and company knowledge consequences', () => {
  const draggedSack: OrdinaryContractDto = {
    ...herbs,
    instanceId: 'ci.m1.dragged-sack.01',
    issuerRoleId: 'northern-grain-hauler',
    issuerLocation: { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' },
    deadlineTicks: '1000',
    yourCargo: ['dragged-sack.01'],
  };
  const activeSackView = render(
    draggedSack,
    { siteId: 'severny-dvor', building: 'elder' },
    'severny-dvor',
  );
  expect(activeSackView).toContain('мешок с мукой');
  expect(activeSackView).toContain('один день кампании с момента принятия поручения');

  const withdrawnCargo: OrdinaryContractDto = {
    ...draggedSack,
    canReturnCargo: true,
    yourRole: 'NONE',
    state: 'OFFERED',
  };
  const issuerView = render(
    withdrawnCargo,
    { siteId: 'severny-dvor', building: 'elder' },
    'severny-dvor',
  );
  expect(issuerView).toContain('Отнесите мешок заказчику в Северный Двор.');
  expect(issuerView).toContain('Вернуть мешок заказчику без выплаты');
  expect(render(withdrawnCargo, null, 'kamenny-brod')).not.toContain(
    'Вернуть мешок заказчику без выплаты',
  );

  const expiredCargo: OrdinaryContractDto = {
    ...draggedSack,
    state: 'EXPIRED',
    deadlineTicks: '1000',
    canWithdraw: false,
    canReturnCargo: true,
  };
  const expiredView = render(
    expiredCargo,
    { siteId: 'severny-dvor', building: 'elder' },
    'severny-dvor',
  );
  expect(expiredView).toContain('срок истёк без выплаты');
  expect(expiredView).toContain('Вернуть мешок заказчику без выплаты');
  expect(expiredView).not.toContain('один день с момента принятия поручения');

  const shortReturn: OrdinaryContractDto = {
    ...draggedSack,
    yourCargo: [],
    state: 'COMPLETED',
    terminalPayout: 'NO_PAYOUT',
    terminalFindingTextKey:
      'contract.ci.m1.dragged-sack.01.result.dragged-sack.returned-after-withdrawal',
    publicConsequences: {
      kind: 'DRAGGED_SACK',
      northernDvorGrain: 'SHORT_SACK',
      yourCompanyKnowsYeremaSlept: true,
    },
  };
  expect(
    render(shortReturn, { siteId: 'severny-dvor', building: 'elder' }, 'severny-dvor'),
  ).toContain('Ерёма забирает мешок. Платить он не будет: вы отказались от поручения.');
  expect(contractPlaceFacts([shortReturn])).toEqual([
    {
      instanceId: 'ci.m1.dragged-sack.01',
      siteId: 'severny-dvor',
      text: 'Ерёма снова повёз муку в город.',
    },
    {
      instanceId: 'ci.m1.dragged-sack.01:grain',
      siteId: 'severny-dvor',
      text: 'В амбар вернули не всю муку: мальчишкам оставили по шапке.',
    },
    {
      instanceId: 'ci.m1.dragged-sack.01:sleep',
      siteId: 'severny-dvor',
      text: 'Вы знаете: Ерёма заснул на телеге. Лошадь сама довезла его домой.',
    },
  ]);
  const otherCompanyFacts = contractPlaceFacts([
    {
      ...shortReturn,
      publicConsequences: {
        kind: 'DRAGGED_SACK',
        northernDvorGrain: 'SHORT_SACK',
        yourCompanyKnowsYeremaSlept: false,
      },
    },
  ]);
  expect(otherCompanyFacts).toHaveLength(2);
  expect(otherCompanyFacts.map((fact) => fact.instanceId)).not.toContain(
    'ci.m1.dragged-sack.01:sleep',
  );
});
