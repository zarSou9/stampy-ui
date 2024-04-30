import {useState} from 'react'
import {ShouldRevalidateFunction, useSearchParams} from '@remix-run/react'
import SettingsIcon from '~/components/icons-generated/Settings'
import Page from '~/components/Page'
import Chatbot from '~/components/Chatbot'
import {ChatSettings, Mode} from '~/hooks/useChat'
import Button from '~/components/Button'

export const shouldRevalidate: ShouldRevalidateFunction = () => false

export default function App() {
  const [params] = useSearchParams()
  const [showSettings, setShowSettings] = useState(false)
  const [chatSettings, setChatSettings] = useState({mode: 'default'} as ChatSettings)
  const question = params.get('question') || undefined

  const ModeButton = ({name, mode}: {name: string; mode: Mode}) => (
    <Button
      className={chatSettings.mode === mode ? 'primary-alt' : ''}
      action={() => setChatSettings({...chatSettings, mode})}
    >
      {name}
    </Button>
  )

  const stopBubbling = (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
  }

  return (
    <Page noFooter>
      <div className="page-body full-height" onClick={() => setShowSettings(false)}>
        <Chatbot
          question={question}
          questions={[
            'What is AI Safety?',
            'How would the AI even get out in the world?',
            'Do people seriously worry about existential risk from AI?',
          ]}
          settings={chatSettings}
        />
        <div className="settings-container" onClick={stopBubbling}>
          {showSettings && (
            <div className="settings bordered flex-container">
              <div>Answer detail</div>
              <ModeButton mode="default" name="Default" />
              <ModeButton mode="rookie" name="Detailed" />
              <ModeButton mode="concise" name="Concise" />
            </div>
          )}
          <SettingsIcon
            width="32"
            height="32"
            className="pointer"
            onClick={() => setShowSettings((current) => !current)}
          />
        </div>
      </div>
    </Page>
  )
}
