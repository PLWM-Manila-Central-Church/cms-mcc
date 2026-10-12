import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EventReservationFields from './EventReservationFields';

describe('EventReservationFields', () => {
  it('renders bounded seat and parking inputs only when configured', () => {
    render(<EventReservationFields capacity={12} totalParkingSlots={4} />);

    expect(screen.getByRole('group', { name: 'Optional seat and parking reservations' })).toBeInTheDocument();
    expect(screen.getByLabelText('Event seat number')).toHaveAttribute('max', '12');
    expect(screen.getByLabelText('Event parking slot')).toHaveAttribute('max', '4');
  });

  it('allows entering a seat or parking slot', () => {
    const onSeatNumberChange = vi.fn();
    const onParkingSlotChange = vi.fn();
    render(
      <EventReservationFields
        capacity={12}
        totalParkingSlots={4}
        seatNumber="3"
        parkingSlot="2"
        onSeatNumberChange={onSeatNumberChange}
        onParkingSlotChange={onParkingSlotChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Event seat number'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Event parking slot'), { target: { value: '4' } });
    expect(onSeatNumberChange).toHaveBeenCalledWith('8');
    expect(onParkingSlotChange).toHaveBeenCalledWith('4');
  });

  it('renders only parking when seating capacity is not configured', () => {
    render(<EventReservationFields capacity={null} totalParkingSlots={4} />);

    expect(screen.queryByLabelText('Event seat number')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Event parking slot')).toBeInTheDocument();
  });

  it('renders nothing when the event has no seat or parking limits', () => {
    const { container } = render(<EventReservationFields capacity={null} totalParkingSlots={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
