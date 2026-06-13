import { config } from '@vue/test-utils'

config.global.stubs = {
  Teleport: {
    template: '<div><slot /></div>',
  },
  TransitionGroup: {
    template: '<div><slot /></div>',
  },
  Icon: {
    template: '<span class="icon-stub" />',
  },
}
