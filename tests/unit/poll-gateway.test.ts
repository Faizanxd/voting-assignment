import { PollGateway } from '../../src/interface/ws/poll-gateway';
import { VoteCastEvent } from '../../src/application/events/vote-cast-event';

test('broadcastResults sends poll_results to correct room', () => {
  const toMock = jest.fn().mockReturnThis();
  const emitMock = jest.fn();

  const ioMock: any = {
    of: jest.fn().mockReturnValue({ to: toMock, emit: emitMock }),
  };

  const gateway = new PollGateway(ioMock as any);
  const event = new VoteCastEvent('poll123', [{ optionId: 'opt1', count: 5 }]);

  gateway.broadcastResults(event);

  expect(ioMock.of).toHaveBeenCalledWith('/polls');
  expect(toMock).toHaveBeenCalledWith('poll:poll123');
  expect(emitMock).toHaveBeenCalledWith('poll_results', {
    pollId: 'poll123',
    results: [{ optionId: 'opt1', count: 5 }],
  });
});
